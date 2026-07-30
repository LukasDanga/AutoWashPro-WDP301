const mongoose = require('mongoose');

const isDev = process.env.NODE_ENV !== 'production';

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');

    // Patch startSession to avoid transaction errors on standalone MongoDB.
    //
    // QUAN TRỌNG: chỉ apply trong development. Atlas M0 (free tier) không hỗ trợ
    // multi-document transactions, nhưng production vẫn cần transaction semantics
    // để đảm bảo tính nhất quán giữa booking / payment / wallet / slot pack.
    // Nếu production dùng Atlas M0 → set ENABLE_DEV_SESSION_PATCH=1 để force patch.
    //
    // Tác động nếu sai: mỗi write bọc transaction sẽ thành no-op → dữ liệu không
    // nhất quán (booking bị cancel nhưng payment không refund, hoặc slot pack trừ
    // lượt nhưng booking không tạo).
    if (process.env.ENABLE_DEV_SESSION_PATCH === '1') {
      const originalStartSession = mongoose.startSession.bind(mongoose);
      mongoose.startSession = async function () {
        const session = await originalStartSession();
        session.startTransaction = () => {};
        session.commitTransaction = async () => {};
        session.abortTransaction = async () => {};
        session.inTransaction = () => false;
        session.withTransaction = async (cb) => {
          // Khi bypass transaction, gọi callback ngay lập tức mà không retry
          return await cb();
        };
        return session;
      };
      console.warn('\x1b[31m%s\x1b[0m', '[db] WARNING: DEV SESSION PATCH IS ENABLED (ENABLE_DEV_SESSION_PATCH=1). TRANSACTIONS ARE BYPASSED. DO NOT USE IN PRODUCTION!');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
