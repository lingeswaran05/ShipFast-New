import mongoose from 'mongoose';

let cachedConnection = null;

export const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState >= 1) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shipfast';

  try {
    const opts = {
      bufferCommands: false,
      autoIndex: true,
    };

    const conn = await mongoose.connect(uri, opts);
    cachedConnection = conn;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // If running in development without local mongo, log helpful tip
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Please ensure MongoDB is running or configure MONGODB_URI in mern-backend/.env');
    }
    throw error;
  }
};
