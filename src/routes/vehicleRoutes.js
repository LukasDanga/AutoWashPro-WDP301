const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../utils/helpers');
const { vehicleValidators } = require('../utils/validators');
const vehicleController = require('../controllers/vehicleController');

router.use(authenticate);

router.post('/', vehicleValidators.create, validate, vehicleController.addVehicle);
router.get('/', vehicleController.getMyVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.put('/:id', vehicleValidators.update, validate, vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
