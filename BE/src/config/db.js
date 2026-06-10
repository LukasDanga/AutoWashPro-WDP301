const mongoose = require('mongoose');

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');

    // Patch startSession to avoid transaction errors on standalone MongoDB
    const originalStartSession = mongoose.startSession.bind(mongoose);
    mongoose.startSession = async function() {
      const session = await originalStartSession();
      const isReplicaSet = !!mongoose.connection.client?.topology?.s?.description?.type?.includes('ReplicaSet');
      if (!isReplicaSet) {
        session.startTransaction = () => {};
        session.commitTransaction = async () => {};
        session.abortTransaction = async () => {};
      }
      return session;
    };
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
