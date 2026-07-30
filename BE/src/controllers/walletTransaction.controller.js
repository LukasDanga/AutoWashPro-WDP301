const WalletTransaction = require('../models/walletTransaction.schema');
const { catchAsync, success } = require('../utils/helpers');

exports.getMyWalletTransactions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { userId: req.userId };
  if (req.query.type) {
    query.type = req.query.type; // 'credit' or 'debit'
  }

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('bookingId', 'bookingCode')
      .lean(),
    WalletTransaction.countDocuments(query),
  ]);

  success(res, transactions, 'Đã lấy lịch sử giao dịch ví', 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  });
});
