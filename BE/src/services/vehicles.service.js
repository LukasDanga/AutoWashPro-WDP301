const mongoose = require('mongoose');
const { Vehicle } = require('../models');

exports.addVehicle = async (userId, data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const normalizedPlate = data.licensePlate.replace(/\s+/g, '').toUpperCase();
    const existing = await Vehicle.findOne({ userId, licensePlate: normalizedPlate }).session(session);
    if (existing) {
      throw Object.assign(new Error('Vehicle with this license plate already exists'), { statusCode: 409, code: 'VEHICLE_EXISTS' });
    }

    if (data.isDefault) {
      await Vehicle.updateMany({ userId }, { isDefault: false }).session(session);
    }

    const vehicle = new Vehicle({ ...data, userId, licensePlate: normalizedPlate });
    await vehicle.save({ session });

    await session.commitTransaction();
    return vehicle;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.getMyVehicles = async (userId) => {
  return Vehicle.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};

exports.getVehicleById = async (vehicleId, userId) => {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
  if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
  return vehicle;
};

exports.updateVehicle = async (vehicleId, userId, updates) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId }).session(session);
    if (!vehicle) {
      throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }

    if (updates.licensePlate) {
      updates.licensePlate = updates.licensePlate.replace(/\s+/g, '').toUpperCase();
      const dup = await Vehicle.findOne({ _id: { $ne: vehicleId }, userId, licensePlate: updates.licensePlate }).session(session);
      if (dup) {
        throw Object.assign(new Error('License plate already in use'), { statusCode: 409, code: 'VEHICLE_EXISTS' });
      }
    }

    if (updates.isDefault) {
      await Vehicle.updateMany({ userId, _id: { $ne: vehicleId } }, { isDefault: false }).session(session);
    }

    Object.assign(vehicle, updates);
    await vehicle.save({ session });

    await session.commitTransaction();
    return vehicle;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.deleteVehicle = async (vehicleId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: vehicleId, userId }).session(session);
    if (!vehicle) {
      throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }

    if (vehicle.isDefault) {
      const nextDefault = await Vehicle.findOne({ userId, _id: { $ne: vehicleId } })
        .sort({ createdAt: -1 })
        .session(session);
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save({ session });
      }
    }

    await session.commitTransaction();
    return vehicle;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};
