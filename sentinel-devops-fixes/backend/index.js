// Load environment variables
require('dotenv').config();

// Validate configuration before starting
const { validateConfig } = require('./config/validator');
validateConfig({ exitOnError: process.env.NODE_ENV === 'production' });
const { setupWebSocket } = require('./websocket');
const express = require('express');
const { ERRORS } = require('./lib/errors');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth } = require('./docker/client');
const containerMonitor = require('./docker/monitor');
const healer = require('./docker/healer');
const scalingPredictor = require('./docker/scaling-predictor');
const { insertActivityLog, getActivityLogs, insertAIReport, getAIReports } = require('./db/logs');
const { routeEvent } = require('./config/notifications');

const pendingApprovals = new Map();

function executeHealing(incident) {
  logActivity('info', `Executing healing for incident ${incident.id}`);
  routeEvent('healing.started', incident);

  setTimeout(() => {
    logActivity('success', `Healing completed for incident ${incident.id}`);
    routeEvent('healing.completed', incident);
  }, 6000); // Simulate healing duration
}

function initiateHealingProtocol(incident) {
  const incidentId = String(incident.id);
  const configuredTimeout = Number(process.env.AUTO_HEAL_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 5 * 60 * 1000;
  const timeout = setTimeout(() => {
    const approval = pendingApprovals.get(incidentId);
    if (approval) {
      pendingApprovals.delete(incidentId);
      logActivity('warn', `Timeout reached for ${incidentId}, auto-proceeding with healing.`);
      executeHealing(incident);
    }
  }, timeoutMs); // Configurable auto-proceed timeout

  pendingApprovals.set(incidentId, {
    incident,
    timeout
  });

  routeEvent('incident.detected', incident);
}

// New Services
const serviceMonitor = require('./services/monitor');
const incidents = require('./services/incidents');
const k8sWatcher = require('./kubernetes/watcher');

// Metrics
const { metricsMiddleware } = require('./metrics/middleware');
const metricsRoutes = require('./routes/metrics.routes');
const { startCollectors } = require('./metrics/collectors');

// RBAC Routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const rolesRoutes = require('./routes/roles.routes');
const approvalsRoutes = require('./routes/approvals.routes');
const kubernetesRoutes = require('./routes/kubernetes.routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { requireAuth } = require('./auth/middleware');

// Distributed Traces Routes
const traceRoutes = require('./routes/traces.routes');

// Contact Routes
const contactRoutes = require('./routes/contact.routes');

// Feedback Routes - Operational Memory
const feedbackRoutes = require('./routes/feedback.routes');

// Reasoning Routes - AI Transparency
const reasoningRoutes = require('./routes/reasoning.routes');

// FinOps Routes & Collector
const finopsRoutes = require('./finops/routes');
const { startCollector: startFinOpsCollector } = require('./finops/metricsCollector');

// Multi-cluster services configuration
const { 
  getServicePortMap,
  getRemoteAgentConfig,
  resolveServiceKey
} = require('./config/servicesLoader');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(metricsMiddleware); // Metrics middleware

// Rate limiters
app.use('/api', apiLimiter);

// Require authentication for feedback
app.use('/api/feedback', requireAuth, feedbackRoutes);

// Security Routes
const securityRoutes = require('./routes/security.routes');
app.use('/api/security', requireAuth, securityRoutes);
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({
  extended: true,
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
})); // Handle Slack URL-encoded payloads

// RBAC Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/approvals', approvalsRoutes);

// FinOps Routes
app.use('/api/finops', finopsRoutes);

// Distributed Traces Routes
app.use('/api/traces', traceRoutes);

// Contact Routes
app.use('/api', contactRoutes);

// Reasoning Routes - AI Transparency
app.use('/api/reasoning', requireAuth, reasoningRoutes);

// --- IN-MEMORY DATABASE ---
// systemStatus is managed by serviceMonitor (single source of truth)
// Use serviceMonitor.getSystemStatus() everywhere

let activityLog = [];
let aiLogs = [];
let nextLogId = 1;

function logActivity(type, message) {
  const entry = {
    id: nextLogId++,
    timestamp: new Date().toISOString(),
    type,
    message
  };
  activityLog.unshift(entry);
  if (activityLog.length > 100) activityLog.pop(); // Keep last 100 in memory
  console.log(`[LOG] ${type}: ${message}`);

  // Persist to PostgreSQL (fire-and-forget)
  insertActivityLog(type, message).catch(() => { });

  // Broadcast the new log entry to all connected WebSocket clients
  wsBroadcaster.broadcast('ACTIVITY_LOG', entry);
}

// WebSocket Broadcaster
let wsBroadcaster = { broadcast: () => { } };

// Smart Restart Tracking
const restartTracker = new Map(); // containerId -> { attempts: number, lastAttempt: number }
const MAX_RESTARTS = 3;
const GRACE_PERIOD_MS = 60 * 1000; // 1 minute

// --- ENDPOINTS FOR FRONTEND ---

// Single source of truth: always use serviceMonitor.getSystemStatus()
app.get('/api/status', (req, res) => {
  res.json(serviceMonitor.getSystemStatus());
});

app.get('/api/services', (req, res) => {
  res.json({ services: serviceMonitor.getAllServicesInfo() });
});

app.get('/api/activity', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const { logs, total } = await getActivityLogs(limit, offset);
    res.json({ activity: logs, total, limit, offset });
  } catch (err) {
    // Fallback to in-memory via incidents service
    res.json({ activity: incidents.getActivityLog().slice(offset, offset + limit) });
  }
});

app.get('/api/insights', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const { reports, total } = await getAIReports(limit, offset);
    res.json({ insights: reports, total, limit, offset });
  } catch (err) {
    // Fallback to in-memory via incidents service
    res.json({ insights: incidents.getAiLogs().slice(offset, offset + limit) });
  }
});

// --- REMOTE AGENT METRICS ENDPOINT ---
const AGENT_WEBHOOK_SECRET = process.env.AGENT_WEBHOOK_SECRET;

/**
 * Agent authentication middleware — FAILS CLOSED.
 * If AGENT_WEBHOOK_SECRET is not configured, the endpoint is disabled (503).
 * If the secret is configured but not provided or incorrect, returns 401.
 */
function verifyAgentAuth(req, res, next) {
  if (!AGENT_WEBHOOK_SECRET) {
    // Fail closed: if secret is not configured, deny access entirely
    return res.status(503).json({ error: 'Agent metrics endpoint not configured. Set AGENT_WEBHOOK_SECRET.' });
  }

  const agentSecret = req.headers['x-agent-secret'];
  if (!agentSecret || agentSecret !== AGENT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid agent secret' });
  }
  
  next();
}

app.post('/api/agent/metrics', verifyAgentAuth, (req, res) => {
  const { clusterId, services, timestamp } = req.body;
  
  if (!clusterId || !services) {
    return res.status(400).json({ error: 'Missing required fields: clusterId, services' });
  }
  
  serviceMonitor.handleRemoteAgentReport({
    clusterId,
    clusterName: clusterId,
    region: 'remote',
    services
  });
  
  res.json({ success: true, message: 'Metrics processed' });
});

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  const systemStatus = serviceMonitor.getSystemStatus();

  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
    // Create an incident/insight object
    const insight = {
      id: Date.now(),
      timestamp: new Date(),
      analysis: aiReport,
      summary: aiReport
    };
    aiLogs.unshift(insight);
    if (aiLogs.length > 50) aiLogs.pop();

    // Persist to PostgreSQL (fire-and-forget)
    insertAIReport(aiReport, aiReport).catch(() => { });

    logActivity('info', 'Received new AI Analysis report');

    // Broadcast new incident/insight
    wsBroadcaster.broadcast('INCIDENT_NEW', insight);

    // Call routeEvent with the incident payload for ChatOps
    initiateHealingProtocol({
      ...insight,
      title: 'Application Insight Alert',
      description: insight.summary,
      type: 'ai_insight',
      severity: 'Medium'
    });
    const newInsight = incidents.addAiLog(aiReport);

    incidents.logActivity('info', 'Received new AI Analysis report');

    if (globalWsBroadcaster) {
      globalWsBroadcaster.broadcast('INCIDENT_NEW', newInsight);
    }
  }
  systemStatus.lastUpdated = new Date();

  if (metrics) {
    Object.keys(metrics).forEach(serviceName => {
      if (systemStatus.services[serviceName]) {
        systemStatus.services[serviceName].code = metrics[serviceName].code || 0;
        const code = metrics[serviceName].code;
        const newStatus = code >= 200 && code < 300 ? 'healthy' :
          code >= 500 ? 'critical' : 'degraded';

        if (systemStatus.services[serviceName].status !== newStatus) {
          const severity = newStatus === 'healthy' ? 'success' : (newStatus === 'critical' ? 'alert' : 'warn');
          incidents.logActivity(severity, `Metric update: ${serviceName} is now ${newStatus}`);
        }

        systemStatus.services[serviceName].status = newStatus;
        systemStatus.services[serviceName].lastUpdated = new Date();
      }
    });

    if (globalWsBroadcaster) {
      globalWsBroadcaster.broadcast('METRICS', systemStatus);
    }
  }

  res.json({ success: true });
});

app.post('/api/action/:service/:type', async (req, res) => {
  const { service, type } = req.params;
  
  // Resolve bare service name to full cluster:name key
  const resolved = resolveServiceKey(service);
  
  incidents.logActivity('info', `Triggering action '${type}' on service '${service}'`);

  if (!resolved || !resolved.port) {
    incidents.logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json(ERRORS.SERVICE_NOT_FOUND(service).toJSON());
  }

  try {
    let mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    await axios.post(`http://localhost:${resolved.port}/simulate/${mode}`, {}, { timeout: 5000 });
    // Force a health check to update status immediately
    await serviceMonitor.checkServiceHealth();

    incidents.logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    incidents.logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

// --- CHATOPS ENDPOINTS ---
const crypto = require('crypto');

// Slack request signature verification middleware
function verifySlackSignature(req, res, next) {
  const slackSignature = req.headers['x-slack-signature'];
  const slackTimestamp = req.headers['x-slack-request-timestamp'];

  if (!slackSignature || !slackTimestamp) {
    return res.status(401).json({ error: 'Verification failed - Missing headers' });
  }

  // Protect against replay attacks (5 min)
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - slackTimestamp) > 300) {
    return res.status(401).json({ error: 'Verification failed - Timestamp too old' });
  }

  const sigBasestring = 'v0:' + slackTimestamp + ':' + req.rawBody;
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSigningSecret) {
    console.warn('SLACK_SIGNING_SECRET is not set. Verification bypassed.');
    return next();
  }

  const mySignature = 'v0=' + crypto.createHmac('sha256', slackSigningSecret).update(sigBasestring, 'utf8').digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))) {
    next();
  } else {
    return res.status(401).json({ error: 'Verification failed - Signature mismatch' });
  }
}

app.post('/api/chatops/slack/actions', verifySlackSignature, (req, res) => {
  try {
    if (req.body && req.body.payload) {
      const payload = JSON.parse(req.body.payload);
      if (payload.type === 'block_actions') {
        const action = payload.actions[0];
        if (action && action.value) {
          const parts = action.value.split('_');
          const actionType = parts[0];
          const incidentId = parts.slice(1).join('_');

          const approval = pendingApprovals.get(incidentId);
          if (approval) {
            pendingApprovals.delete(incidentId);
            clearTimeout(approval.timeout); // Clear the auto-proceed timeout

            if (actionType === 'approve') {
              executeHealing(approval.incident);
            } else if (actionType === 'decline') {
              logActivity('warn', `Healing manually declined for incident ${incidentId}`);
            }
          } else {
            console.warn(`ChatOps: Action taken on expired or non-existent incident ${incidentId}`);
          }
        }
      }
    }
    res.status(200).send();
  } catch (e) {
    console.error(`ChatOps Action Error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// --- DOCKER ENDPOINTS ---

// Middleware for ID/Service validation (mock auth for docker endpoints)
const requireDockerAuth = (req, res, next) => {
  // In a real app, check 'Authorization' header
  // For now, assume authenticated if internal or trusted
  next();
};

app.get('/api/settings/notifications', requireDockerAuth, (req, res) => {
  const settings = require('./config/notifications').getSettings();
  const isConfigured = (url) => !!url;
  res.json({
    slackWebhook: isConfigured(settings.slackWebhook),
    discordWebhook: isConfigured(settings.discordWebhook),
    teamsWebhook: isConfigured(settings.teamsWebhook),
    notifyOnNewIncident: settings.notifyOnNewIncident,
    notifyOnHealing: settings.notifyOnHealing
  });
});

app.post('/api/settings/notifications', requireDockerAuth, (req, res) => {
  const { slackWebhook, discordWebhook, teamsWebhook, notifyOnNewIncident, notifyOnHealing } = req.body;

  const updates = {};
  if (slackWebhook !== undefined && typeof slackWebhook === 'string' && !slackWebhook.includes('...')) updates.slackWebhook = slackWebhook;
  if (discordWebhook !== undefined && typeof discordWebhook === 'string' && !discordWebhook.includes('...')) updates.discordWebhook = discordWebhook;
  if (teamsWebhook !== undefined && typeof teamsWebhook === 'string' && !teamsWebhook.includes('...')) updates.teamsWebhook = teamsWebhook;
  if (notifyOnNewIncident !== undefined) updates.notifyOnNewIncident = notifyOnNewIncident === true || notifyOnNewIncident === 'true';
  if (notifyOnHealing !== undefined) updates.notifyOnHealing = notifyOnHealing === true || notifyOnHealing === 'true';

  require('./config/notifications').updateSettings(updates);

  logActivity('info', 'Notification settings updated via Dashboard.');
  res.json({ success: true, message: 'Settings saved successfully' });
});

app.post('/api/settings/notifications/test', requireDockerAuth, async (req, res) => {
  const { platform, webhookUrl } = req.body;
  const testIncident = {
    id: `MOCK-${Date.now()}`,
    title: 'Mock Sentinel Test Event',
    description: 'This is a test notification from Sentinel DevOps Agent to verify webhook configuration.',
    status: 'incident.detected',
    severity: 'Info',
    type: 'sentinel.test'
  };

  const currentSettings = require('./config/notifications').getSettings();
  const tempConfig = { ...currentSettings };

  if (typeof webhookUrl === 'string' && webhookUrl !== 'true' && !webhookUrl.includes('...')) {
    if (platform === 'slack') tempConfig.slackWebhook = webhookUrl;
    if (platform === 'discord') tempConfig.discordWebhook = webhookUrl;
    if (platform === 'teams') tempConfig.teamsWebhook = webhookUrl;
  }

  try {
    if (platform === 'slack') {
      await require('./integrations/slack').sendIncidentAlert(testIncident, tempConfig);
    } else if (platform === 'discord') {
      await require('./integrations/discord').sendIncidentAlert(testIncident, tempConfig);
    } else if (platform === 'teams') {
      await require('./integrations/teams').sendIncidentAlert(testIncident, tempConfig);
    } else {
      return res.status(400).json({ error: 'Unknown platform' });
    }
    res.json({ success: true, message: 'Test Successful' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const validateId = (req, res, next) => {
  if (!req.params.id || typeof req.params.id !== 'string' || req.params.id.length < 1) {
    return res.status(400).json(ERRORS.INVALID_ID().toJSON());
  }
  next();
};

const validateScaleParams = (req, res, next) => {
  const replicasRaw = req.params.replicas;
  const replicas = Number(replicasRaw);
  if (!req.params.service || !/^\d+$/.test(replicasRaw) || !Number.isInteger(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json(ERRORS.INVALID_SCALE_PARAMS().toJSON());
  }
  next();
};

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await listContainers();
    // Monitor initialization is now global and event-driven via monitor.init()
    // No need to aggressively start monitoring on every list request

    // Enrich with smart restart meta
    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: containerMonitor.getMetrics(c.id), // Include current metrics snapshot
        restartCount: tracker.attempts,
        lastRestart: tracker.lastAttempt
      };
    });

    // Broadcast container updates to all WebSocket clients
    wsBroadcaster.broadcast('CONTAINER_UPDATE', { containers: enrichedContainers });

    res.json({ containers: enrichedContainers });
  } catch (error) {
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

app.get('/api/docker/health/:id', validateId, async (req, res) => {
  try {
    const health = await getContainerHealth(req.params.id);
    res.json(health);
  } catch (error) {
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

app.get('/api/docker/metrics/:id', validateId, (req, res) => {
  const metrics = containerMonitor.getMetrics(req.params.id);
  if (!metrics) {
    return res.status(404).json(ERRORS.NO_DATA().toJSON());
  }
  res.json(metrics);
});

app.post('/api/docker/try-restart/:id', requireDockerAuth, validateId, async (req, res) => {
  const id = req.params.id;
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };

  // Reset attempts if outside grace period
  if (now - tracker.lastAttempt > GRACE_PERIOD_MS) {
    tracker.attempts = 0;
  }

  if (tracker.attempts >= MAX_RESTARTS) {
    return res.status(429).json(ERRORS.MAX_RESTARTS_EXCEEDED().toJSON());
  }

  tracker.attempts++;
  tracker.lastAttempt = now;
  restartTracker.set(id, tracker);

  try {
    const result = await healer.restartContainer(id);
    res.json({ allowed: true, ...result });
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/restart/:id', requireDockerAuth, validateId, async (req, res) => {
  const id = req.params.id;
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };
  tracker.lastAttempt = now;
  restartTracker.set(id, tracker);

  try {
    const result = await healer.restartContainer(id);

    // Broadcast updated containers after restart
    try {
      const containers = await listContainers();
      const enriched = containers.map(c => ({
        ...c,
        metrics: containerMonitor.getMetrics(c.id),
        restartCount: (restartTracker.get(c.id) || { attempts: 0 }).attempts,
        lastRestart: (restartTracker.get(c.id) || { lastAttempt: 0 }).lastAttempt
      }));
      wsBroadcaster.broadcast('CONTAINER_UPDATE', { containers: enriched });
    } catch (_) { /* best-effort broadcast */ }

    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/recreate/:id', requireDockerAuth, validateId, async (req, res) => {
  try {
    const result = await healer.recreateContainer(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/scale/:service/:replicas', requireDockerAuth, validateScaleParams, async (req, res) => {
  try {
    const result = await healer.scaleService(req.params.service, req.params.replicas);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/scale-bulk', requireDockerAuth, async (req, res) => {
  try {
    const aiDecisionStr = req.body.aiDecision;
    let decisions = [];
    if (typeof aiDecisionStr === 'string') {
      try {
        const match = aiDecisionStr.match(/\[.*\]/s);
        decisions = JSON.parse(match ? match[0] : aiDecisionStr);
      } catch (e) {
        console.error('Failed to parse AI scale decisions', e);
        return res.status(400).json({ success: false, error: 'Invalid AI payload format' });
      }
    } else if (Array.isArray(aiDecisionStr)) {
      decisions = aiDecisionStr;
    } else {
      decisions = [aiDecisionStr];
    }

    const results = [];
    for (const d of decisions) {
      if (d && d.action === 'scale-out' && d.service && d.replicas) {
        logActivity('info', `Proactively scaling ${d.service} to ${d.replicas} based on AI decision`);
        const result = await healer.scaleService(d.service, d.replicas);
        results.push(result);
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    console.error('Scale bulk error:', error);
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

// --- PREDICTION ENDPOINTS ---

app.get('/api/predictions', (req, res) => {
  const predictions = scalingPredictor.getPredictions();
  const evaluatedAt = predictions.length > 0
    ? predictions.reduce((latest, p) => p.evaluatedAt > latest ? p.evaluatedAt : latest, predictions[0].evaluatedAt)
    : new Date().toISOString();
  res.json({ predictions, evaluatedAt });
});

app.get('/api/predictions/:id', validateId, (req, res) => {
  const prediction = scalingPredictor.getPrediction(req.params.id);
  if (!prediction) {
    return res.status(404).json({ error: 'No prediction available for this container' });
  }
  res.json(prediction);
});

// ============================================
// MULTI-CLUSTER / MULTI-REGION API ENDPOINTS
// ============================================

/**
 * GET /api/clusters - Get all services grouped by cluster
 */
app.get('/api/clusters', (req, res) => {
  const clusters = serviceMonitor.getServicesGroupedByCluster();
  res.json({ clusters });
});

/**
 * GET /api/regions - Get all services grouped by region
 */
app.get('/api/regions', (req, res) => {
  const regions = serviceMonitor.getServicesGroupedByRegion();
  res.json({ regions });
});

/**
 * GET /api/services/grouped - Get services with cluster/region metadata
 */
app.get('/api/services/grouped', (req, res) => {
  const groupBy = req.query.groupBy || 'cluster';
  
  if (groupBy === 'region') {
    res.json({ 
      groupBy: 'region',
      data: serviceMonitor.getServicesGroupedByRegion() 
    });
  } else {
    res.json({ 
      groupBy: 'cluster',
      data: serviceMonitor.getServicesGroupedByCluster() 
    });
  }
});

/**
 * POST /api/remote-agent/report - Receive health reports from remote agents
 * Protected by enabled check and webhook secret verification
 */
app.post('/api/remote-agent/report', (req, res) => {
  const remoteAgentConfig = getRemoteAgentConfig();
  
  // Guard: check if remote agents are enabled
  if (!remoteAgentConfig.enabled) {
    return res.status(404).json({ error: 'Remote agents are disabled' });
  }
  
  // Guard: require webhook secret when enabled
  if (!remoteAgentConfig.webhookSecret) {
    return res.status(500).json({ error: 'Remote agent webhook secret not configured' });
  }
  
  // Verify webhook secret via HMAC signature
  const signature = req.headers['x-sentinel-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature header' });
  }
  
  const hmac = crypto.createHmac('sha256', remoteAgentConfig.webhookSecret);
  // Use raw body for HMAC verification to ensure consistency
  const bodyToVerify = req.rawBody || JSON.stringify(req.body);
  hmac.update(bodyToVerify);
  const expectedSignature = 'sha256=' + hmac.digest('hex');
  
  // Check signature lengths first to avoid timingSafeEqual throwing on length mismatch
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  
  if (signatureBuffer.length !== expectedBuffer.length) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { type, clusterId, clusterName, region, timestamp, services: reportedServices } = req.body;
  
  if (type !== 'agent_report') {
    return res.status(400).json({ error: 'Invalid report type' });
  }
  
  if (!clusterId || !reportedServices) {
    return res.status(400).json({ error: 'Missing clusterId or services in report' });
  }
  
  // Handle the remote agent report
  serviceMonitor.handleRemoteAgentReport({
    clusterId,
    clusterName: clusterName || clusterId,
    region: region || 'remote',
    services: reportedServices
  });
  
  logActivity('info', `Received health report from remote agent: ${clusterId} (${Object.keys(reportedServices).length} services)`);
  
  res.json({ 
    success: true, 
    message: `Report received for cluster ${clusterId}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/remote-agent/status - Check remote agent configuration status
 */
app.get('/api/remote-agent/status', (req, res) => {
  const config = getRemoteAgentConfig();
  res.json({
    enabled: config.enabled,
    hasWebhookSecret: !!config.webhookSecret,
    endpointsCount: config.endpoints.length
  });
});

let globalWsBroadcaster;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
  // Start FinOps metrics collector
  startFinOpsCollector();
});

// Setup WebSocket
globalWsBroadcaster = setupWebSocket(server);
wsBroadcaster = globalWsBroadcaster; // Synergize both references
serviceMonitor.setWsBroadcaster(globalWsBroadcaster);

// Initialize Predictive Scaling Engine
scalingPredictor.init(containerMonitor, globalWsBroadcaster);

// React to scale recommendations
scalingPredictor.on('scale-recommendation', (prediction) => {
  logActivity('alert', `🔮 Scale Alert: ${prediction.containerName} at ${Math.round(prediction.failureProbability * 100)}% failure risk — Recommendation: ${prediction.recommendation}`);
});

// Listen for container predictions - MUST be before init to catch startup predictions
containerMonitor.on('prediction', (prediction) => {
  if (prediction.probability > 0.8 && prediction.confidence !== 'low') {
    incidents.logActivity('alert', `🔮 Prediction: Container ${prediction.containerId.substring(0, 12)} risk ${Math.round(prediction.probability * 100)}%. ${prediction.reason}`);

    if (prediction.probability > 0.85) {
      console.log(`[Healing] manual intervention recommended for ${prediction.containerId}`);
    }
  }

  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('PREDICTION', prediction);
  }
});

// Initialize monitoring on startup - After listeners are attached
containerMonitor.init();

// K8s Watcher Event Handling
k8sWatcher.on('oom', (pod) => {
  incidents.logActivity('alert', `K8s: Pod ${pod.name} (ns: ${pod.namespace}) OOMKilled`);
  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('K8S_EVENT', {
      type: 'OOM',
      pod,
      message: `Pod ${pod.name} was OOMKilled`
    });
  }
});

k8sWatcher.on('crashloop', (pod) => {
  incidents.logActivity('warn', `K8s: Pod ${pod.name} (ns: ${pod.namespace}) CrashLoopBackOff`);
  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('K8S_EVENT', {
      type: 'CRASHLOOP',
      pod,
      message: `Pod ${pod.name} is in CrashLoopBackOff`
    });
  }
});

// Start service monitoring
serviceMonitor.startMonitoring();
startCollectors(); // Start Prometheus collectors
