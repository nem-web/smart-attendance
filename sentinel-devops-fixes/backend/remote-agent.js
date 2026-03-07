#!/usr/bin/env node
/**
 * Remote Agent for Multi-Cluster Monitoring
 * 
 * Deploy this script on remote hosts to forward health data to the central Sentinel backend.
 * 
 * Usage:
 *   node remote-agent.js --endpoint http://sentinel-backend:4000 --cluster prod-us --secret YOUR_WEBHOOK_SECRET
 * 
 * Environment Variables:
 *   SENTINEL_ENDPOINT - Central Sentinel backend URL
 *   SENTINEL_CLUSTER - Cluster identifier for this agent
 *   AGENT_WEBHOOK_SECRET - Shared secret for authentication
 *   POLL_INTERVAL - Health check interval in ms (default: 5000)
 *   SERVICES - JSON array of services to monitor
 * 
 * Example SERVICES config:
 *   [{"name": "auth", "url": "http://localhost:3001/health"}, ...]
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
let config = {
  endpoint: process.env.SENTINEL_ENDPOINT || 'http://localhost:4000',
  cluster: process.env.SENTINEL_CLUSTER || 'remote',
  secret: process.env.AGENT_WEBHOOK_SECRET || process.env.AGENT_SECRET || '',
  interval: parseInt(process.env.POLL_INTERVAL) || 5000,
  services: []
};

// Parse command line arguments
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--endpoint=')) {
    config.endpoint = arg.split('=')[1];
  } else if (arg.startsWith('--cluster=')) {
    config.cluster = arg.split('=')[1];
  } else if (arg.startsWith('--secret=')) {
    config.secret = arg.split('=')[1];
  } else if (arg.startsWith('--interval=')) {
    config.interval = parseInt(arg.split('=')[1]);
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Remote Agent for Sentinel Multi-Cluster Monitoring

Usage: node remote-agent.js [options]

Options:
  --endpoint=<url>   Central Sentinel backend URL (default: http://localhost:4000)
  --cluster=<id>     Cluster identifier (default: remote)
  --secret=<secret>  Webhook authentication secret
  --interval=<ms>    Health check interval in ms (default: 5000)
  --help, -h         Show this help message

Environment Variables:
  SENTINEL_ENDPOINT   Override --endpoint
  SENTINEL_CLUSTER    Override --cluster
  AGENT_WEBHOOK_SECRET  Authentication secret
  POLL_INTERVAL       Override --interval
  SERVICES            JSON array of services to monitor

Example:
  SENTINEL_ENDPOINT=http://sentinel:4000 \\
  SENTINEL_CLUSTER=prod-us \\
  AGENT_WEBHOOK_SECRET=mysecret \\
  node remote-agent.js
`);
    process.exit(0);
  }
});

// Load services from environment or file
function loadServices() {
  // Try SERVICES environment variable first
  if (process.env.SERVICES) {
    try {
      const parsed = JSON.parse(process.env.SERVICES);
      if (Array.isArray(parsed)) {
        config.services = parsed;
        return;
      }
    } catch (e) {
      console.error('Failed to parse SERVICES env var:', e.message);
    }
  }

  // Try services.config.json in current directory
  const configPath = path.join(process.cwd(), 'services.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Support both flat array and cluster-based schema
      if (parsed.services && Array.isArray(parsed.services)) {
        // Legacy flat format: { "services": [...] }
        config.services = parsed.services;
        return;
      } else if (parsed.clusters && Array.isArray(parsed.clusters)) {
        // New cluster-based format: { "clusters": [{ "services": [...] }] }
        // Find the cluster matching this agent's cluster ID, or use first cluster
        const matchingCluster = parsed.clusters.find(c => c.id === config.cluster) || parsed.clusters[0];
        if (matchingCluster && Array.isArray(matchingCluster.services)) {
          config.services = matchingCluster.services;
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load services.config.json:', e.message);
    }
  }

  // Default services if nothing configured
  config.services = [
    { name: 'auth', url: 'http://localhost:3001/health' },
    { name: 'payment', url: 'http://localhost:3002/health' },
    { name: 'notification', url: 'http://localhost:3003/health' }
  ];
}

let systemStatus = {};
let isChecking = false;

async function checkServiceHealth() {
  if (isChecking) return;
  isChecking = true;

  try {
    const timestamp = new Date();
    const servicesStatus = {};

    for (const service of config.services) {
      let status, code;
      const start = Date.now();

      try {
        const response = await axios.get(service.url, { timeout: 30000 });
        status = 'healthy';
        code = response.status;
      } catch (error) {
        code = error.response?.status || 503;
        status = code >= 500 ? 'critical' : 'degraded';
      }

      servicesStatus[service.name] = {
        status,
        code,
        lastUpdated: timestamp
      };

      const duration = ((Date.now() - start) / 1000).toFixed(3);
      console.log(`[${config.cluster}] ${service.name}: ${status} (${code}) - ${duration}s`);
    }

    // Send to central Sentinel
    await sendMetrics(servicesStatus, timestamp);
  } finally {
    isChecking = false;
  }
}

async function sendMetrics(servicesStatus, timestamp) {
  const payload = {
    clusterId: config.cluster,
    services: servicesStatus,
    timestamp: timestamp.toISOString()
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.secret) {
    headers['x-agent-secret'] = config.secret;
  }

  try {
    await axios.post(`${config.endpoint}/api/agent/metrics`, payload, {
      headers,
      timeout: 10000
    });
    console.log(`[${config.cluster}] Metrics sent to ${config.endpoint}`);
  } catch (error) {
    console.error(`[${config.cluster}] Failed to send metrics: ${error.message}`);
  }
}

async function start() {
  loadServices();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Sentinel Remote Agent Started                    ║
╠════════════════════════════════════════════════════════════╣
║  Cluster: ${config.cluster.padEnd(47)}║
║  Endpoint: ${config.endpoint.padEnd(47)}║
║  Services: ${config.services.length.toString().padEnd(47)}║
║  Interval: ${`${config.interval}ms`.padEnd(47)}║
╚════════════════════════════════════════════════════════════╝
  `);

  // Initial check
  await checkServiceHealth();

  // Continuous monitoring
  setInterval(checkServiceHealth, config.interval);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${config.cluster}] Shutting down agent...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${config.cluster}] Shutting down agent...`);
  process.exit(0);
});

start().catch(err => {
  console.error(`[${config.cluster}] Fatal error:`, err);
  process.exit(1);
});
