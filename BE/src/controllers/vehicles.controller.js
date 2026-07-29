const vehicleService = require('../services/vehicles.service');
const { catchAsync, success } = require('../utils/helpers');
const sseService = require('../services/sse.service');
const SOCKET_EVENTS = require('../utils/socketEvents');

const notificationService = require('../services/notification.service');

exports.addVehicle = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.addVehicle(req.userId, req.body);
  sseService.sendToUser(req.userId, SOCKET_EVENTS.MY_VEHICLES_UPDATED, {});
  notificationService.send(
    req.userId,
    'Thêm phương tiện thành công',
    `Bạn đã thêm thành công xe ${vehicle.brand} ${vehicle.model} (BKS: ${vehicle.licensePlate}) vào tài khoản.`,
    'vehicle_added',
    { vehicleId: vehicle._id }
  ).catch(err => console.error('Error sending vehicle notification:', err));
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
  sseService.sendToUser(req.userId, SOCKET_EVENTS.MY_VEHICLES_UPDATED, {});
  success(res, vehicle, 'Vehicle updated');
});

exports.deleteVehicle = catchAsync(async (req, res) => {
  await vehicleService.deleteVehicle(req.params.id, req.userId);
  sseService.sendToUser(req.userId, SOCKET_EVENTS.MY_VEHICLES_UPDATED, {});
  success(res, null, 'Vehicle deleted');
});
