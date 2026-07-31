const WalletTransaction = require('../models/walletTransaction.schema');
const Booking = require('../models/booking.schema');
const { catchAsync, success } = require('../utils/helpers');

exports.getMyWalletTransactions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { userId: req.userId };
  if (req.query.type) {
    query.type = req.query.type; // 'credit' or 'debit'
  }

  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'bookingId',
        select: 'bookingCode status bookingDate startTime endTime packagePrice packageName selectedSubServices voucherCode discountAmount finalPrice depositAmount paymentStatus paymentMethod note',
        populate: [
          { path: 'branchId', select: 'name address phone' },
          { path: 'vehicleId', select: 'licensePlate brand model vehicleType color' },
          { path: 'packageId', select: 'name price description subServices' },
        ],
      })
      .lean(),
    WalletTransaction.countDocuments(query),
  ]);

  // Smart resolution for booking code if tx.bookingId is null or incomplete
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx.bookingId && tx.reason) {
      const match = tx.reason.match(/(AW-\d{8}-[A-Z0-9]+)/i);
      if (match) {
        const code = match[1];
        const booking = await Booking.findOne({ bookingCode: code })
          .select('bookingCode status bookingDate startTime endTime packagePrice packageName selectedSubServices voucherCode discountAmount finalPrice depositAmount paymentStatus paymentMethod note')
          .populate('branchId', 'name address phone')
          .populate('vehicleId', 'licensePlate brand model vehicleType color')
          .populate('packageId', 'name price description subServices')
          .lean();
        if (booking) {
          tx.bookingId = booking;
        }
      }
    }
  }

  success(res, transactions, 'Đã lấy lịch sử giao dịch ví', 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  });
});

exports.getWalletTransactionById = catchAsync(async (req, res) => {
  let tx = await WalletTransaction.findOne({ _id: req.params.id, userId: req.userId })
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'branchId', select: 'name address phone' },
        { path: 'vehicleId', select: 'licensePlate brand model vehicleType color' },
        { path: 'packageId', select: 'name price description subServices' }
      ]
    })
    .lean();

  if (!tx) {
    throw Object.assign(new Error('Giao dịch không tồn tại'), { statusCode: 404 });
  }

  if (!tx.bookingId && tx.reason) {
    const match = tx.reason.match(/(AW-\d{8}-[A-Z0-9]+)/i);
    if (match) {
      const code = match[1];
      const booking = await Booking.findOne({ bookingCode: code })
        .populate('branchId', 'name address phone')
        .populate('vehicleId', 'licensePlate brand model vehicleType color')
        .populate('packageId', 'name price description subServices')
        .lean();
      if (booking) {
        tx.bookingId = booking;
      }
    }
  }

  success(res, tx, 'Chi tiết giao dịch ví');
});
