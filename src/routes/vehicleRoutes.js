const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../utils/helpers');
const { vehicleValidators } = require('../utils/validators');
const vehicleController = require('../controllers/vehicleController');

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
 *             required: [licensePlate, brand, model, vehicleType]
 *             properties:
 *               licensePlate: { type: string, example: "30A-12345" }
 *               brand: { type: string, example: "Toyota" }
 *               model: { type: string, example: "Camry" }
 *               color: { type: string, example: "Black" }
 *               vehicleType: { type: string, enum: ['sedan', 'suv', 'pickup', 'van', 'other'], example: "sedan" }
 *     responses:
 *       201:
 *         description: Vehicle added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 */
router.get('/', vehicleController.getMyVehicles);

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
 *         description: Vehicle ID
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
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               licensePlate: { type: string }
 *               brand: { type: string }
 *               model: { type: string }
 *               color: { type: string }
 *               vehicleType: { type: string, enum: ['sedan', 'suv', 'pickup', 'van', 'other'] }
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
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted
 *       404:
 *         description: Vehicle not found
 */
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
