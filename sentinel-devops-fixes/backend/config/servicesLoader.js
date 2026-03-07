/**
 * Services Configuration Loader for Sentinel
 * 
 * Supports dynamic loading of service configurations from:
 * 1. SERVICES_CONFIG environment variable (JSON string)
 * 2. backend/services.config.json file
 * 
 * Enables multi-cluster/multi-region monitoring by allowing operators
 * to configure named clusters with their service URLs.
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Schema for validating service configuration
const ServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  url: z.string().url('Service URL must be a valid URL'),
  type: z.enum(['api', 'database', 'worker', 'cache']).optional().default('api'),
  port: z.number().int().positive().optional(),
  description: z.string().optional().default('')
});

const ClusterSchema = z.object({
  id: z.string().min(1, 'Cluster ID is required'),
  name: z.string().min(1, 'Cluster name is required'),
  region: z.string().optional().default('default'),
  description: z.string().optional().default(''),
  services: z.array(ServiceSchema).min(1, 'At least one service is required')
});

const RemoteAgentEndpointSchema = z.object({
  id: z.string().min(1, 'Endpoint ID is required'),
  url: z.string().url('Endpoint URL must be valid'),
  clusterId: z.string().min(1, 'Cluster ID is required')
});

const RemoteAgentsSchema = z.object({
  enabled: z.boolean().default(false),
  webhookSecret: z.string().optional().default(''),
  endpoints: z.array(RemoteAgentEndpointSchema).default([])
}).refine(
  data => !data.enabled || data.webhookSecret.trim() !== '',
  { message: 'webhookSecret required when enabled is true' }
);

const ServicesConfigSchema = z.object({
  clusters: z.array(ClusterSchema).min(1, 'At least one cluster is required'),
  remoteAgents: RemoteAgentsSchema.optional().default({ enabled: false, webhookSecret: '', endpoints: [] })
});

// Default configuration (fallback)
const DEFAULT_CONFIG = {
  clusters: [
    {
      id: 'local',
      name: 'Local Development',
      region: 'local',
      description: 'Local Docker host services',
      services: [
        { name: 'auth', url: 'http://localhost:3001/health', type: 'api', port: 3001 },
        { name: 'payment', url: 'http://localhost:3002/health', type: 'worker', port: 3002 },
        { name: 'notification', url: 'http://localhost:3003/health', type: 'api', port: 3003 }
      ]
    }
  ],
  remoteAgents: { enabled: false, webhookSecret: '', endpoints: [] }
};

let cachedConfig = null;

/**
 * Load services configuration from environment or file
 * @param {Object} options - { forceReload: boolean, silent: boolean }
 * @returns {Object} Validated services configuration
 */
function loadServicesConfig(options = {}) {
  const { forceReload = false, silent = false } = options;

  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  let config = null;
  let source = 'default';

  // Priority 1: SERVICES_CONFIG environment variable
  if (process.env.SERVICES_CONFIG) {
    try {
      config = JSON.parse(process.env.SERVICES_CONFIG);
      source = 'SERVICES_CONFIG environment variable';
    } catch (err) {
      if (!silent) {
        console.warn(`⚠️  Failed to parse SERVICES_CONFIG: ${err.message}`);
        console.warn('   Falling back to file or default configuration.');
      }
    }
  }

  // Priority 2: services.config.json file
  if (!config) {
    const configPath = path.join(__dirname, '..', 'services.config.json');
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(fileContent);
        source = 'services.config.json';
      } catch (err) {
        if (!silent) {
          console.warn(`⚠️  Failed to read services.config.json: ${err.message}`);
          console.warn('   Falling back to default configuration.');
        }
      }
    }
  }

  // Priority 3: Default configuration
  if (!config) {
    config = DEFAULT_CONFIG;
    source = 'default';
  }

  // Validate configuration
  try {
    const validated = ServicesConfigSchema.parse(config);
    cachedConfig = validated;

    if (!silent) {
      const totalServices = validated.clusters.reduce((sum, c) => sum + c.services.length, 0);
      console.log(`✅ Loaded services config from ${source}`);
      console.log(`   📊 ${validated.clusters.length} cluster(s), ${totalServices} service(s)`);
    }

    return validated;
  } catch (err) {
    console.error(`❌ Invalid services configuration from ${source}: ${err.message}`);
    if (err.errors) {
      err.errors.forEach(e => console.error(`   - ${e.path.join('.')}: ${e.message}`));
    }
    console.warn('⚠️  Falling back to default configuration due to validation errors');
    
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * Get all services as a flat array (for backward compatibility)
 * @returns {Array} Array of service objects with cluster metadata
 */
function getAllServices() {
  const config = loadServicesConfig({ silent: true });
  const services = [];

  for (const cluster of config.clusters) {
    for (const service of cluster.services) {
      services.push({
        ...service,
        cluster: cluster.id,
        clusterName: cluster.name,
        region: cluster.region
      });
    }
  }

  return services;
}

/**
 * Get services grouped by cluster
 * @returns {Object} Object with cluster IDs as keys
 */
function getServicesByCluster() {
  const config = loadServicesConfig({ silent: true });
  const grouped = {};

  for (const cluster of config.clusters) {
    grouped[cluster.id] = {
      ...cluster,
      services: cluster.services.map(s => ({
        ...s,
        cluster: cluster.id,
        clusterName: cluster.name,
        region: cluster.region
      }))
    };
  }

  return grouped;
}

/**
 * Get services grouped by region
 * @returns {Object} Object with region names as keys
 */
function getServicesByRegion() {
  const config = loadServicesConfig({ silent: true });
  const grouped = {};

  for (const cluster of config.clusters) {
    const region = cluster.region || 'default';
    if (!grouped[region]) {
      grouped[region] = {
        region,
        clusters: [],
        services: []
      };
    }
    grouped[region].clusters.push(cluster.id);
    for (const service of cluster.services) {
      grouped[region].services.push({
        ...service,
        cluster: cluster.id,
        clusterName: cluster.name,
        region: cluster.region
      });
    }
  }

  return grouped;
}

/**
 * Get remote agent configuration
 * @returns {Object} Remote agents configuration
 */
function getRemoteAgentConfig() {
  const config = loadServicesConfig({ silent: true });
  return config.remoteAgents || { enabled: false, webhookSecret: '', endpoints: [] };
}

/**
 * Get service port mapping for backward compatibility.
 * Keys are namespaced as cluster:name to avoid collisions.
 * Also includes bare name keys for single-cluster backward compatibility.
 * @returns {Object} Service name to port mapping
 */
function getServicePortMap() {
  const services = getAllServices();
  const portMap = {};
  
  for (const service of services) {
    if (service.port) {
      // Use namespaced keys to avoid collisions between clusters
      const namespacedKey = `${service.cluster}:${service.name}`;
      portMap[namespacedKey] = service.port;
      
      // Also map bare name for backward compatibility (last one wins if collisions)
      // This allows /api/action/:service/:type to work with bare service names
      if (!portMap[service.name]) {
        portMap[service.name] = service.port;
      }
    }
  }
  
  return portMap;
}

/**
 * Resolve a bare service name to its full cluster:name key.
 * Useful for action routing where the incoming param is a bare name.
 * @param {string} serviceName - Bare service name (e.g., "auth")
 * @returns {Object|null} { key, port, cluster } or null if not found
 */
function resolveServiceKey(serviceName) {
  const services = getAllServices();
  
  // First try exact namespaced match (cluster:name)
  const exactMatch = services.find(s => `${s.cluster}:${s.name}` === serviceName);
  if (exactMatch) {
    return {
      key: `${exactMatch.cluster}:${exactMatch.name}`,
      port: exactMatch.port,
      cluster: exactMatch.cluster,
      name: exactMatch.name,
      url: exactMatch.url
    };
  }
  
  // Fall back to bare name match (first match wins)
  const bareMatch = services.find(s => s.name === serviceName);
  if (bareMatch) {
    return {
      key: `${bareMatch.cluster}:${bareMatch.name}`,
      port: bareMatch.port,
      cluster: bareMatch.cluster,
      name: bareMatch.name,
      url: bareMatch.url
    };
  }
  
  return null;
}

/**
 * Clear cached configuration (useful for testing)
 */
function clearCache() {
  cachedConfig = null;
}

module.exports = {
  loadServicesConfig,
  getAllServices,
  getServicesByCluster,
  getServicesByRegion,
  getRemoteAgentConfig,
  getServicePortMap,
  resolveServiceKey,
  clearCache,
  DEFAULT_CONFIG,
  ServicesConfigSchema
};
