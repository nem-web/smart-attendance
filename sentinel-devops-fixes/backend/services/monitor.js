const axios = require('axios');
const { logActivity } = require('./incidents');
const { metrics } = require('../metrics/prometheus');
const { 
  getAllServices: getConfiguredServices, 
  getServicesByCluster,
  getServicesByRegion,
  loadServicesConfig 
} = require('../config/servicesLoader');

// Load services dynamically from configuration
const configuredServices = getConfiguredServices();

// Initialize system status from configuration
// Uses ${cluster}:${name} as keys to avoid collisions across clusters
function initializeSystemStatus() {
  const services = {};
  for (const svc of configuredServices) {
    const key = `${svc.cluster}:${svc.name}`;
    services[key] = { 
      status: 'unknown', 
      code: 0, 
      lastUpdated: null,
      cluster: svc.cluster,
      clusterName: svc.clusterName,
      region: svc.region
    };
  }
  return {
    services,
    clusters: getServicesByCluster(),
    aiAnalysis: "Waiting for AI report...",
    lastUpdated: new Date()
  };
}

let systemStatus = initializeSystemStatus();

// Get flat services array from configuration
const services = configuredServices.map(s => ({
  name: s.name,
  url: s.url,
  type: s.type,
  cluster: s.cluster,
  clusterName: s.clusterName,
  region: s.region,
  port: s.port
}));

let wsBroadcaster = null;
let isChecking = false;

function setWsBroadcaster(broadcaster) {
  wsBroadcaster = broadcaster;
}

/**
 * Single source of truth for system status.
 * All consumers (GET /api/status, polling loop, etc.) must use this.
 */
function getSystemStatus() {
  return systemStatus;
}

function getAllServicesInfo() {
  return services.map(service => {
    const key = `${service.cluster}:${service.name}`;
    return {
      ...service,
      ...systemStatus.services[key]
    };
  });
}

async function checkServiceHealth() {
  if (isChecking) return;
  isChecking = true;

  try {
    console.log('🔍 Checking service health...');
    let hasChanges = false;

    for (const service of services) {
      const key = `${service.cluster}:${service.name}`;
      const currentServiceStatus = systemStatus.services[key];
      if (!currentServiceStatus) continue;
      
      let newStatus, newCode;
      const start = Date.now();
      
      try {
        const response = await axios.get(service.url, { timeout: 30000 });
        const duration = (Date.now() - start) / 1000;
        metrics.responseTime.observe({ 
          service: service.name, 
          cluster: service.cluster,
          endpoint: service.url 
        }, duration);
        
        console.log(`✅ [${service.cluster}] ${service.name}: ${response.status}`);
        newStatus = 'healthy';
        newCode = response.status;
      } catch (error) {
        const duration = (Date.now() - start) / 1000;
        metrics.responseTime.observe({ 
          service: service.name, 
          cluster: service.cluster,
          endpoint: service.url 
        }, duration);
        
        const code = error.response?.status || 503;
        console.log(`❌ [${service.cluster}] ${service.name}: ERROR - ${error.code || error.message}`);
        newStatus = code >= 500 ? 'critical' : 'degraded';
        newCode = code;
      }

      if (
        currentServiceStatus.status !== newStatus ||
        currentServiceStatus.code !== newCode
      ) {
        const prevStatus = currentServiceStatus.status;

        // Log Status Changes
        if (newStatus === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
          logActivity('success', `Service ${service.name} (${service.cluster}) recovered to HEALTHY`);
        } else if (newStatus !== 'healthy' && prevStatus !== newStatus) {
          const severity = newStatus === 'critical' ? 'alert' : 'warn';
          logActivity(severity, `Service ${service.name} (${service.cluster}) is ${newStatus.toUpperCase()} (Code: ${newCode})`);
        }

        systemStatus.services[key] = {
          ...currentServiceStatus,
          status: newStatus,
          code: newCode,
          lastUpdated: new Date()
        };
        hasChanges = true;

        // Broadcast individual service update
        if (wsBroadcaster) {
          wsBroadcaster.broadcast('SERVICE_UPDATE', {
            name: service.name,
            cluster: service.cluster,
            ...systemStatus.services[key]
          });
        }
      }
    }

    if (hasChanges) {
      systemStatus.lastUpdated = new Date();
      // Broadcast full metrics update
      if (wsBroadcaster) {
        wsBroadcaster.broadcast('METRICS', systemStatus);
      }
    }
  } finally {
    isChecking = false;
  }
}

function startMonitoring(intervalMs = 5000) {
  checkServiceHealth();
  setInterval(checkServiceHealth, intervalMs);
}

/**
 * Update service status (e.g. from agent metrics or remote reports).
 * Uses cluster:name key format.
 */
function updateServiceStatus(serviceName, statusData, clusterId = 'local') {
  const key = `${clusterId}:${serviceName}`;
  if (systemStatus.services[key]) {
    systemStatus.services[key] = { 
      ...systemStatus.services[key], 
      ...statusData,
      lastUpdated: new Date()
    };
  }
}

/**
 * Get services grouped by cluster with current status
 * @returns {Object} Clusters with service status
 */
function getServicesGroupedByCluster() {
    const clusters = {};
    
    for (const service of services) {
        const clusterId = service.cluster || 'default';
        const key = `${clusterId}:${service.name}`;
        if (!clusters[clusterId]) {
            clusters[clusterId] = {
                id: clusterId,
                name: service.clusterName || clusterId,
                region: service.region || 'default',
                services: []
            };
        }
        clusters[clusterId].services.push({
            ...service,
            ...systemStatus.services[key]
        });
    }
    
    // Add remote agent services (already using cluster:name keys)
    for (const [key, data] of Object.entries(systemStatus.services)) {
        if (key.includes(':')) {
            const [cluster] = key.split(':');
            // Skip if already covered by configured services
            const isConfigured = services.some(s => `${s.cluster}:${s.name}` === key);
            if (isConfigured) continue;
            
            if (!clusters[cluster]) {
                clusters[cluster] = {
                    id: cluster,
                    name: data.clusterName || cluster,
                    region: data.region || 'remote',
                    services: []
                };
            }
            clusters[cluster].services.push({ 
                name: key,
                ...data 
            });
        }
    }
    
    return clusters;
}

/**
 * Get services grouped by region with current status
 * @returns {Object} Regions with service status
 */
function getServicesGroupedByRegion() {
    const regions = {};
    
    for (const service of services) {
        const regionId = service.region || 'default';
        const key = `${service.cluster}:${service.name}`;
        if (!regions[regionId]) {
            regions[regionId] = {
                region: regionId,
                services: []
            };
        }
        regions[regionId].services.push({
            ...service,
            ...systemStatus.services[key]
        });
    }
    
    // Add remote agent services
    for (const [key, data] of Object.entries(systemStatus.services)) {
        if (key.includes(':')) {
            const isConfigured = services.some(s => `${s.cluster}:${s.name}` === key);
            if (isConfigured) continue;
            
            const regionId = data.region || 'remote';
            if (!regions[regionId]) {
                regions[regionId] = {
                    region: regionId,
                    services: []
                };
            }
            regions[regionId].services.push({
                name: key,
                ...data
            });
        }
    }
    
    return regions;
}

/**
 * Handle incoming metrics from remote agents.
 * Uses cluster:name namespaced keys to prevent collisions.
 */
function handleRemoteAgentReport(report) {
    const { clusterId, clusterName, region, services: reportedServices } = report;
    
    for (const [serviceName, serviceData] of Object.entries(reportedServices)) {
        const fullServiceName = `${clusterId}:${serviceName}`;
        
        // Initialize if not exists
        if (!systemStatus.services[fullServiceName]) {
            systemStatus.services[fullServiceName] = {
                status: 'unknown',
                code: 0,
                lastUpdated: null,
                cluster: clusterId,
                clusterName: clusterName,
                region: region
            };
        }
        
        const prevStatus = systemStatus.services[fullServiceName].status;
        const newStatus = String(serviceData.status || 'unknown');
        
        // Log status changes
        if (newStatus === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
            logActivity('success', `[${clusterId}] Service ${serviceName} recovered to HEALTHY`);
        } else if (newStatus !== 'healthy' && prevStatus !== newStatus) {
            const severity = newStatus === 'critical' ? 'alert' : 'warn';
            logActivity(severity, `[${clusterId}] Service ${serviceName} is ${newStatus.toUpperCase()}`);
        }
        
        systemStatus.services[fullServiceName] = {
            ...systemStatus.services[fullServiceName],
            status: newStatus,
            code: serviceData.code,
            latencyMs: serviceData.latencyMs,
            lastUpdated: new Date(serviceData.lastUpdated || Date.now())
        };
    }
    
    systemStatus.lastUpdated = new Date();
    
    // Broadcast update
    if (wsBroadcaster) {
        wsBroadcaster.broadcast('METRICS', systemStatus);
    }
}

module.exports = {
  getSystemStatus,
  getAllServicesInfo,
  startMonitoring,
  setWsBroadcaster,
  updateServiceStatus,
  checkServiceHealth,
  getServicesGroupedByCluster,
  getServicesGroupedByRegion,
  handleRemoteAgentReport
};
