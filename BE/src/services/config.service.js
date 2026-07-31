const { SystemConfig } = require('../models');

// In-memory cache to prevent DB hit on every request
// Structure: cache[scope][referenceId][key] = value
let configCache = {
  global: {},
  branch: {},
  package: {}
};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validates value type based on config schema
 */
function validateType(value, type) {
  if (value === null || value === undefined) return false;
  switch (type) {
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'json': return typeof value === 'object';
    default: return false;
  }
}

/**
 * Loads all configurations into memory cache
 * Gracefully handles DB failures by retaining stale cache if an error occurs.
 */
async function loadCache() {
  try {
    const configs = await SystemConfig.find().lean();
    const newCache = { global: {}, branch: {}, package: {} };
    
    for (const config of configs) {
      const scope = config.scope || 'global';
      const refId = config.referenceId ? config.referenceId.toString() : 'default';
      
      if (!newCache[scope]) newCache[scope] = {};
      if (!newCache[scope][refId]) newCache[scope][refId] = {};
      
      newCache[scope][refId][config.key] = config.value;
    }
    
    configCache = newCache;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error('[ConfigService] Failed to load config cache from DB:', error.message);
    // If cache is entirely empty, we have a cold-start failure. We'll rely on defaultValue in get().
  }
}

/**
 * Gets a configuration value.
 * Supports hierarchical resolution: package -> branch -> global
 * 
 * @param {string} key - Config key
 * @param {object} overrides - Object containing { branchId, packageId }
 * @param {any} defaultValue - Fallback if not found in DB
 */
exports.get = async (key, overrides = {}, defaultValue = null) => {
  if (Date.now() - cacheTimestamp > CACHE_TTL_MS) {
    await loadCache();
  }

  // 1. Try Package Scope
  if (overrides.packageId) {
    const pkgId = overrides.packageId.toString();
    if (configCache.package?.[pkgId] && configCache.package[pkgId][key] !== undefined) {
      return configCache.package[pkgId][key];
    }
  }

  // 2. Try Branch Scope
  if (overrides.branchId) {
    const branchId = overrides.branchId.toString();
    if (configCache.branch?.[branchId] && configCache.branch[branchId][key] !== undefined) {
      return configCache.branch[branchId][key];
    }
  }

  // 3. Fallback to Global Scope
  if (configCache.global?.default && configCache.global.default[key] !== undefined) {
    return configCache.global.default[key];
  }

  // 4. Hardcoded Fallback
  return defaultValue;
};

/**
 * Sets a configuration value with audit logging and versioning
 */
exports.set = async ({ key, value, type, category = 'general', scope = 'global', referenceId = null, isPublic = false, description = '', userId = null, reason = 'Cập nhật cấu hình' }) => {
  if (!validateType(value, type)) {
    throw Object.assign(new Error(`Giá trị không hợp lệ cho kiểu ${type}`), { statusCode: 400 });
  }

  let config = await SystemConfig.findOne({ key, scope, referenceId });

  if (!config) {
    config = new SystemConfig({
      key, value, type, category, scope, referenceId, isPublic, description, version: 1,
      auditLog: [{
        oldValue: null,
        newValue: value,
        changedBy: userId,
        reason: reason || 'Khởi tạo cấu hình'
      }]
    });
  } else {
    config.auditLog.push({
      oldValue: config.value,
      newValue: value,
      changedBy: userId,
      reason
    });
    config.value = value;
    config.isPublic = isPublic;
    if (category) config.category = category;
    if (description) config.description = description;
    config.version += 1;
  }

  await config.save();
  await loadCache(); // Force cache invalidation

  return config;
};

/**
 * Rollback configuration to a previous version based on AuditLog history.
 */
exports.rollback = async (key, version, scope = 'global', referenceId = null, userId = null) => {
  const config = await SystemConfig.findOne({ key, scope, referenceId });
  if (!config) throw Object.assign(new Error('Không tìm thấy cấu hình'), { statusCode: 404 });

  if (version > config.version || version < 1) {
    throw Object.assign(new Error('Phiên bản rollback không hợp lệ'), { statusCode: 400 });
  }

  // Find the state of the value exactly AT the target version.
  // The first auditLog entry is version 1, second is version 2, etc.
  const targetLog = config.auditLog[version - 1];
  if (!targetLog) throw Object.assign(new Error('Không tìm thấy dữ liệu phiên bản'), { statusCode: 404 });

  const previousValue = targetLog.newValue;

  // Perform the rollback by appending a new audit log
  config.auditLog.push({
    oldValue: config.value,
    newValue: previousValue,
    changedBy: userId,
    reason: `Rollback về phiên bản v${version}`
  });
  
  config.value = previousValue;
  config.version += 1;
  
  await config.save();
  await loadCache();

  return config;
};

/**
 * Gets all configurations for admin dashboard
 */
exports.getAllConfigs = async (query = {}) => {
  const filter = {};
  if (query.scope) filter.scope = query.scope;
  if (query.isPublic !== undefined) filter.isPublic = query.isPublic;
  if (query.category) filter.category = query.category;
  
  return await SystemConfig.find(filter)
    .populate('auditLog.changedBy', 'name email')
    .sort({ category: 1, scope: 1, key: 1 });
};

/**
 * Gets all PUBLIC configurations for FE/Mobile initialization
 * Merges branch overrides if a branchId is provided.
 */
exports.getPublicConfigs = async (branchId = null) => {
  if (Date.now() - cacheTimestamp > CACHE_TTL_MS) {
    await loadCache();
  }
  
  const publicConfigs = await SystemConfig.find({ isPublic: true }).lean();
  const result = {};
  
  // 1. Load global configs
  for (const config of publicConfigs) {
    if (config.scope === 'global') {
      result[config.key] = config.value;
    }
  }

  // 2. Load branch overrides if requested
  if (branchId) {
    const bIdStr = branchId.toString();
    for (const config of publicConfigs) {
      if (config.scope === 'branch' && config.referenceId && config.referenceId.toString() === bIdStr) {
        result[config.key] = config.value;
      }
    }
  }
  
  return result;
};

/**
 * Force clear cache
 */
exports.clearCache = () => {
  cacheTimestamp = 0;
};
