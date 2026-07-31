const configService = require('../services/config.service');
const sseService = require('../services/sse.service');

exports.getPublicConfigs = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const configs = await configService.getPublicConfigs(branchId);
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllConfigs = async (req, res, next) => {
  try {
    const { scope, isPublic, category } = req.query;
    const query = {};
    if (scope) query.scope = scope;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    if (category) query.category = category;

    const configs = await configService.getAllConfigs(query);
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const { key, value, type, category, scope, referenceId, isPublic, description, reason } = req.body;
    
    // Only Admin or Manager should access this route (handled by middleware)
    const userId = req.user?._id;

    const updatedConfig = await configService.set({
      key,
      value,
      type,
      category,
      scope,
      referenceId,
      isPublic,
      description,
      userId,
      reason
    });

    sseService.broadcastToAll('config_updated', updatedConfig);

    res.json({
      success: true,
      message: 'Cập nhật cấu hình thành công',
      data: updatedConfig,
    });
  } catch (error) {
    next(error);
  }
};

exports.rollbackConfig = async (req, res, next) => {
  try {
    const { key, version, scope, referenceId } = req.body;
    const userId = req.user?._id;

    const rolledBackConfig = await configService.rollback(key, version, scope, referenceId, userId);

    sseService.broadcastToAll('config_updated', rolledBackConfig);

    res.json({
      success: true,
      message: `Khôi phục cấu hình về phiên bản v${version} thành công`,
      data: rolledBackConfig,
    });
  } catch (error) {
    next(error);
  }
};
