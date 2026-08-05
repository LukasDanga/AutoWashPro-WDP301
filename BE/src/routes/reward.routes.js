const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/permissions');
const rewardController = require('../controllers/reward.controller');

/**
 * @swagger
 * /api/rewards:
 *   get:
 *     summary: Lấy danh sách phần thưởng (admin/manager)
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc mô tả
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách phần thưởng
 */
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), rewardController.getAllRewards);

/**
 * @swagger
 * /api/rewards/public:
 *   get:
 *     summary: Lấy danh sách phần thưởng công khai (đang hoạt động)
 *     tags: [Rewards]
 *     responses:
 *       200:
 *         description: Danh sách phần thưởng
 */
router.get('/public', rewardController.getPublicRewards);

/**
 * @swagger
 * /api/rewards/me:
 *   get:
 *     summary: Phần thưởng đã đổi của tôi
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách lượt đổi của người dùng
 */
router.get('/me', authenticate, rewardController.getUserRewards);

/**
 * @swagger
 * /api/rewards/redeem:
 *   post:
 *     summary: Đổi điểm lấy phần thưởng
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rewardId]
 *             properties:
 *               rewardId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đổi thành công
 *       400:
 *         description: Không đủ điểm hoặc hết hàng
 */
router.post('/redeem', authenticate, rewardController.redeemReward);

/**
 * @swagger
 * /api/rewards/redemptions:
 *   get:
 *     summary: Danh sách lượt đổi thưởng (admin/manager)
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [claimed, sent, received, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo mã đổi thưởng hoặc tên quà
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách lượt đổi thưởng
 */
router.get('/redemptions', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), rewardController.getRedemptions);

/**
 * @swagger
 * /api/rewards/redemptions/{id}/sent:
 *   post:
 *     summary: Xác nhận đã gửi quà cho khách (admin/manager)
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchId:
 *                 type: string
 *                 description: Chi nhánh gửi quà (mặc định lấy chi nhánh của tài khoản đang xử lý)
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/redemptions/:id/sent', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), rewardController.markRedemptionSent);

/**
 * @swagger
 * /api/rewards/redemptions/{id}/received:
 *   post:
 *     summary: Khách hàng xác nhận đã nhận quà
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/redemptions/:id/received', authenticate, rewardController.markRedemptionReceived);

/**
 * @swagger
 * /api/rewards:
 *   post:
 *     summary: Tạo phần thưởng mới
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, pointCost, stock]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               imageUrl: { type: string }
 *               pointCost: { type: number }
 *               stock: { type: number }
 *               status: { type: string, enum: [active, inactive] }
 *               sortOrder: { type: number }
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), rewardController.createReward);

/**
 * @swagger
 * /api/rewards/{id}:
 *   get:
 *     summary: Lấy phần thưởng theo ID
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin phần thưởng
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', authenticate, rewardController.getRewardById);

/**
 * @swagger
 * /api/rewards/{id}:
 *   put:
 *     summary: Cập nhật phần thưởng
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), rewardController.updateReward);

/**
 * @swagger
 * /api/rewards/{id}:
 *   delete:
 *     summary: Xóa phần thưởng (admin only)
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), rewardController.deleteReward);

module.exports = router;