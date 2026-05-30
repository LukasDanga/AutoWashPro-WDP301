const vehicleService = require('../services/vehicles.service');
const { catchAsync, success } = require('../utils/helpers');

exports.addVehicle = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.addVehicle(req.userId, req.body);
  success(res, vehicle, 'Vehicle added', 201);
});

exports.getMyVehicles = catchAsync(async (req, res) => {
  const vehicles = await vehicleService.getMyVehicles(req.userId);
  success(res, vehicles, 'Vehicles retrieved');
});

exports.getVehicleById = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id, req.userId);
  success(res, vehicle, 'Vehicle retrieved');
});

exports.updateVehicle = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.userId, req.body);
  success(res, vehicle, 'Vehicle updated');
});

exports.deleteVehicle = catchAsync(async (req, res) => {
  await vehicleService.deleteVehicle(req.params.id, req.userId);
  success(res, null, 'Vehicle deleted');
});
