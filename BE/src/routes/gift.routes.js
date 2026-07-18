const express = require('express');
const router = express.Router();
const giftController = require('../controllers/gift.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/public', giftController.getPublicGifts);
router.post('/spin', authenticate, giftController.spinWheel);

router.use(authenticate);
router.use(authorize('admin', 'manager'));

router.get('/', giftController.getAllGifts);
router.post('/', giftController.createGift);
router.put('/:id', giftController.updateGift);
router.delete('/:id', giftController.deleteGift);

module.exports = router;
