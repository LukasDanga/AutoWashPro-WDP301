const rewardService = require('../services/reward.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getAllRewards = catchAsync(async (req, res) => {
  const result = await rewardService.getAllRewards(req.query);
  success(res, result.data, 'Đã lấy danh sách phần thưởng', 200, result.pagination);
});

exports.getPublicRewards = catchAsync(async (req, res) => {
  const rewards = await rewardService.getPublicRewards();
  success(res, rewards, 'Đã lấy danh sách phần thưởng');
});

exports.getRewardById = catchAsync(async (req, res) => {
  const reward = await rewardService.getRewardById(req.params.id);
  success(res, reward, 'Đã lấy thông tin phần thưởng');
});

exports.createReward = catchAsync(async (req, res) => {
  const reward = await rewardService.createReward({ ...req.body, createdBy: req.userId });
  success(res, reward, 'Tạo phần thưởng thành công', 201);
});

exports.updateReward = catchAsync(async (req, res) => {
  const reward = await rewardService.updateReward(req.params.id, req.body);
  success(res, reward, 'Cập nhật phần thưởng thành công');
});

exports.deleteReward = catchAsync(async (req, res) => {
  await rewardService.deleteReward(req.params.id);
  success(res, null, 'Đã xóa phần thưởng');
});

exports.getUserRewards = catchAsync(async (req, res) => {
  const rewards = await rewardService.getUserRewards(req.userId);
  success(res, rewards, 'Đã lấy danh sách phần thưởng của tôi');
});

exports.redeemReward = catchAsync(async (req, res) => {
  const { rewardId } = req.body;
  if (!rewardId) throw Object.assign(new Error('Reward ID is required'), { statusCode: 400 });

  const result = await rewardService.redeemReward(rewardId, req.userId);
  success(res, result, 'Đổi điểm lấy phần thưởng thành công', 201);
});

exports.getRedemptions = catchAsync(async (req, res) => {
  const result = await rewardService.getRedemptions(req.query);
  success(res, result.data, 'Đã lấy danh sách lượt đổi thưởng', 200, result.pagination);
});

exports.markRedemptionSent = catchAsync(async (req, res) => {
  const branchId = req.body?.branchId || req.user?.branchId;
  const redemption = await rewardService.markRedemptionSent(req.params.id, {
    sentBy: req.userId,
    branchId,
  });
  success(res, redemption, 'Đã gửi quà cho khách hàng');
});

exports.markRedemptionReceived = catchAsync(async (req, res) => {
  const redemption = await rewardService.markRedemptionReceived(req.params.id, req.userId);
  success(res, redemption, 'Đã xác nhận nhận quà');
});