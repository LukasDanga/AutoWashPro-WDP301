const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { packageValidators } = require('../utils/validators');
const packageController = require('../controllers/package.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/packages:
 *   get:
 *     summary: Get all packages
 *     tags: [Packages]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by package name
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *     responses:
 *       200:
 *         description: List of packages
 */
router.get('/', packageController.getAllPackages);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package details
 *       404:
 *         description: Package not found
 */
router.get('/:id', authenticate, packageController.getPackageById);

/**
 * @swagger
 * /api/packages:
 *   post:
 *     summary: Create a package (admin & manager)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, duration]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               price:
 *                 type: number
 *                 minimum: 0
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 description: Duration in minutes
 *               image:
 *                 type: string
 *               branchId:
 *                 type: string
 *                 description: Branch ID (auto-set for manager)
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               category:
 *                 type: string
 *                 enum: [external, internal, full]
 *               vehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [sedan, suv, pickup, van]
 *               subServices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                     duration:
 *                       type: integer
 *                       minimum: 0
 *                       description: Duration in minutes
 *                     isOptional:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Package created
 */
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), packageValidators.create, validate, packageController.createPackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   put:
 *     summary: Update package (admin & manager)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               price:
 *                 type: number
 *                 minimum: 0
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 description: Duration in minutes
 *               image:
 *                 type: string
 *               branchId:
 *                 type: string
 *                 description: Branch ID (auto-set for manager)
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               category:
 *                 type: string
 *                 enum: [external, internal, full]
 *               vehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [sedan, suv, pickup, van]
 *               subServices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                     duration:
 *                       type: integer
 *                       minimum: 0
 *                       description: Duration in minutes
 *                     isOptional:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Package updated
 *       404:
 *         description: Package not found
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), packageValidators.update, validate, packageController.updatePackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     summary: Delete package (admin & manager)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package deleted
 *       404:
 *         description: Package not found
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), packageController.deletePackage);

module.exports = router;
