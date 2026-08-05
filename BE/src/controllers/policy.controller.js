const policyService = require('../services/policy.service');
const sseService = require('../services/sse.service');

exports.getPolicies = async (req, res, next) => {
  try {
    // Auto-seed on first request if empty
    await policyService.seedDefaultPolicies(false);

    const policies = await policyService.getAllPolicies(req.query);
    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

exports.getPolicyBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const policy = await policyService.getPolicyBySlug(slug);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách hoặc dịch vụ tương ứng.'
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

exports.createPolicy = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const newPolicy = await policyService.createPolicy(req.body, userId);

    if (sseService && typeof sseService.broadcastToAll === 'function') {
      sseService.broadcastToAll('policies_updated', { action: 'create', policy: newPolicy });
    }

    res.status(201).json({
      success: true,
      message: 'Tạo chính sách / dịch vụ mới thành công!',
      data: newPolicy
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const updated = await policyService.updatePolicy(id, req.body, userId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách / dịch vụ cần cập nhật.'
      });
    }

    if (sseService && typeof sseService.broadcastToAll === 'function') {
      sseService.broadcastToAll('policies_updated', { action: 'update', policy: updated });
    }

    res.json({
      success: true,
      message: 'Cập nhật chính sách / dịch vụ thành công!',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await policyService.deletePolicy(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách / dịch vụ cần xóa.'
      });
    }

    if (sseService && typeof sseService.broadcastToAll === 'function') {
      sseService.broadcastToAll('policies_updated', { action: 'delete', id });
    }

    res.json({
      success: true,
      message: 'Đã xóa chính sách / dịch vụ thành công!'
    });
  } catch (error) {
    next(error);
  }
};

exports.seedPolicies = async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const result = await policyService.seedDefaultPolicies(force);

    if (sseService && typeof sseService.broadcastToAll === 'function') {
      sseService.broadcastToAll('policies_updated', { action: 'seed' });
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};
