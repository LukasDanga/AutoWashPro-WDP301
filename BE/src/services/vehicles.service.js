const mongoose = require('mongoose');
const { Vehicle } = require('../models');
const { VEHICLE_TYPE } = require('../config/constants');

const SUPPORTED_TYPES = Object.values(VEHICLE_TYPE);

async function createSafeSession() {
  try {
    const topologyType = mongoose.connection.client?.topology?.description?.type || '';
    if (topologyType.includes('ReplicaSet') || topologyType.includes('Sharded')) {
      const session = await mongoose.startSession();
      session.startTransaction();
      return session;
    }
  } catch {
    // fallback if Mongo standalone
  }
  return null;
}

exports.addVehicle = async (userId, data) => {
  if (!SUPPORTED_TYPES.includes(data.vehicleType)) {
    throw Object.assign(
      new Error(`vehicleType must be one of: ${SUPPORTED_TYPES.join(', ')}`),
      { statusCode: 400, code: 'INVALID_VEHICLE_TYPE' }
    );
  }

  const session = await createSafeSession();
  const opts = (session && session.inTransaction()) ? { session } : {};

  try {
    const normalizedPlate = data.licensePlate.replace(/\s+/g, '').toUpperCase();
    const existing = await Vehicle.findOne({ userId, licensePlate: normalizedPlate }, null, opts);
    if (existing) {
      throw Object.assign(new Error('Vehicle with this license plate already exists'), { statusCode: 409, code: 'VEHICLE_EXISTS' });
    }

    if (data.isDefault) {
      await Vehicle.updateMany({ userId }, { isDefault: false }, opts);
    }

    const vehicle = new Vehicle({ ...data, userId, licensePlate: normalizedPlate });
    await vehicle.save(opts);

    if (session && session.inTransaction()) {
      await session.commitTransaction();
    }
    return vehicle;
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
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
  if (updates.vehicleType !== undefined && !SUPPORTED_TYPES.includes(updates.vehicleType)) {
    throw Object.assign(
      new Error(`vehicleType must be one of: ${SUPPORTED_TYPES.join(', ')}`),
      { statusCode: 400, code: 'INVALID_VEHICLE_TYPE' }
    );
  }

  const session = await createSafeSession();
  const opts = (session && session.inTransaction()) ? { session } : {};

  try {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId }, null, opts);
    if (!vehicle) {
      throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }

    if (updates.licensePlate) {
      updates.licensePlate = updates.licensePlate.replace(/\s+/g, '').toUpperCase();
      const dup = await Vehicle.findOne({ _id: { $ne: vehicleId }, userId, licensePlate: updates.licensePlate }, null, opts);
      if (dup) {
        throw Object.assign(new Error('License plate already in use'), { statusCode: 409, code: 'VEHICLE_EXISTS' });
      }
    }

    if (updates.isDefault) {
      await Vehicle.updateMany({ userId, _id: { $ne: vehicleId } }, { isDefault: false }, opts);
    }

    Object.assign(vehicle, updates);
    await vehicle.save(opts);

    if (session && session.inTransaction()) {
      await session.commitTransaction();
    }
    return vehicle;
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
};

exports.deleteVehicle = async (vehicleId, userId) => {
  const session = await createSafeSession();
  const opts = (session && session.inTransaction()) ? { session } : {};

  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: vehicleId, userId }, opts);
    if (!vehicle) {
      throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }

    if (vehicle.isDefault) {
      const nextDefault = await Vehicle.findOne({ userId, _id: { $ne: vehicleId } }, null, opts)
        .sort({ createdAt: -1 });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save(opts);
      }
    }

    if (session && session.inTransaction()) {
      await session.commitTransaction();
    }
    return vehicle;
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
};
