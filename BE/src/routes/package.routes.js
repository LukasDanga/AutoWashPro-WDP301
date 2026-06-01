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
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, packageController.getAllPackages);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, packageController.getPackageById);

/**
 * @swagger
 * /api/packages:
 *   post:
 *     summary: Create a package (admin only)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize(ROLES.ADMIN), packageValidators.create, validate, packageController.createPackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   put:
 *     summary: Update package (admin only)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN), packageValidators.update, validate, packageController.updatePackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     summary: Delete package (admin only)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), packageController.deletePackage);

module.exports = router;
