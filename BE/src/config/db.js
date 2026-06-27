const mongoose = require('mongoose');

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');

    // Patch startSession to avoid transaction errors on standalone MongoDB
    const originalStartSession = mongoose.startSession.bind(mongoose);
    mongoose.startSession = async function() {
      const session = await originalStartSession();
      // No-op all transaction methods in dev (standalone MongoDB doesn't support transactions)
      session.startTransaction = () => {};
      session.commitTransaction = async () => {};
      session.abortTransaction = async () => {};
      session.inTransaction = () => false;
      return session;
    };
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
