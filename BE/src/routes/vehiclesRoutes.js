const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { vehicleValidators } = require('../utils/validators');
const vehicleController = require('../controllers/vehicles.controller');

router.use(authenticate);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Add a new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [licensePlate, vehicleType, brand, color]
 *             properties:
 *               licensePlate: { type: string, example: "30A-12345" }
 *               vehicleType: { type: string, enum: ['sedan', 'suv', 'pickup', 'van'] }
 *               brand: { type: string, example: "Toyota" }
 *               model: { type: string, example: "Camry" }
 *               color: { type: string, example: "Black" }
 *               year: { type: number }
 *               imageUrl: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Vehicle added
 *       400:
 *         description: Validation error
 */
router.post('/', vehicleValidators.create, validate, vehicleController.addVehicle);

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles for current user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get('/', vehicleController.getMyVehicles);

router.get('/user/:userId', authorize('admin', 'manager'), vehicleController.getVehiclesByUserId);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
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
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', vehicleController.getVehicleById);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               licensePlate: { type: string }
 *               vehicleType: { type: string, enum: ['sedan', 'suv', 'pickup', 'van'] }
 *               brand: { type: string }
 *               model: { type: string }
 *               color: { type: string }
 *               year: { type: number }
 *               imageUrl: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       200:
 *         description: Vehicle updated
 *       404:
 *         description: Vehicle not found
 */
router.put('/:id', vehicleValidators.update, validate, vehicleController.updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     tags: [Vehicles]
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
 *         description: Vehicle deleted
 *       404:
 *         description: Vehicle not found
 */
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
