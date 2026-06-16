const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { branchValidators } = require('../utils/validators');
const branchController = require('../controllers/branch.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address]
 *             properties:
 *               name: { type: string, example: "District 1 Branch" }
 *               address: { type: string, example: "123 Nguyen Hue, District 1, HCMC" }
 *               phone: { type: string, example: "02812345678" }
 *               email: { type: string, example: "branch1@autowashpro.com" }
 *               openingTime: { type: string, example: "07:00" }
 *               closingTime: { type: string, example: "18:00" }
 *               status: { type: string, enum: [active, inactive], example: "active" }
 *               image: { type: string, example: "https://example.com/branch.jpg" }
 *     responses:
 *       201:
 *         description: Branch created
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, authorize(ROLES.ADMIN), branchValidators.create, validate, branchController.createBranch);

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (active/inactive)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or address
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get('/', authenticate, branchController.getAllBranches);
router.get('/public', branchController.getPublicBranches);

/**
 * @swagger
 * /api/branches/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branches]
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
 *         description: Branch details
 *       404:
 *         description: Branch not found
 */
router.get('/:id', authenticate, branchController.getBranchById);

/**
 * @swagger
 * /api/branches/{id}:
 *   put:
 *     summary: Update branch
 *     tags: [Branches]
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
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               openingTime: { type: string }
 *               closingTime: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Branch updated
 *       404:
 *         description: Branch not found
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), branchValidators.update, validate, branchController.updateBranch);

/**
 * @swagger
 * /api/branches/{id}:
 *   delete:
 *     summary: Delete branch
 *     tags: [Branches]
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
 *         description: Branch deleted
 *       404:
 *         description: Branch not found
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), branchController.deleteBranch);

/**
 * @swagger
 * /api/branches/{id}/status:
 *   patch:
 *     summary: Update branch status
 *     tags: [Branches]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Branch not found
 */
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), branchValidators.updateStatus, validate, branchController.updateStatus);

module.exports = router;
