const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      mongoose.set('bufferCommands', false);
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      connectionPromise = null; // Reset promise so subsequent requests can retry
      console.error("Failed to connect with mongodb:", error.message);
      if (process.env.VERCEL !== 'true') {
        process.exit(1);
      }
      throw error;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;