const { Booking, Vehicle } = require('../models');

function toStartOfDayDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error('Invalid booking date'), { statusCode: 400, code: 'INVALID_BOOKING_DATE' });
  }

  return date;
}

function buildBookingCode() {
  return `AWB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

exports.createBooking = async (userId, data) => {
  const vehicle = await Vehicle.findOne({ _id: data.vehicleId, userId });
  if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });

  const bookingDate = toStartOfDayDate(data.bookingDate);
  const booking = new Booking({
    userId,
    branchId: data.branchId,
    branchName: data.branchName,
    branchAddress: data.branchAddress,
    vehicleId: vehicle._id,
    vehicleName: data.vehicleName || `${vehicle.brand} ${vehicle.model || ''}`.trim(),
    vehiclePlate: data.vehiclePlate || vehicle.licensePlate,
    vehicleType: data.vehicleType || vehicle.vehicleType,
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    serviceDuration: data.serviceDuration,
    servicePrice: data.servicePrice,
    bookingDate,
    timeSlot: data.timeSlot,
    couponCode: data.couponCode || '',
    discountAmount: Number(data.discountAmount || 0),
    totalAmount: data.totalAmount,
    pointsEarned: Number(data.pointsEarned || 0),
    notes: data.notes || '',
    status: 'confirmed',
    bookingCode: buildBookingCode(),
  });

  await booking.save();
  return booking;
};

exports.getMyBookings = async (userId) => {
  return Booking.find({ userId }).sort({ createdAt: -1 });
};

exports.getBookingById = async (userId, bookingId) => {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  return booking;
};