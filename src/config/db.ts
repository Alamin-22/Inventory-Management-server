import mongoose, { ConnectOptions } from 'mongoose';
import { config } from './env';

const dbOptions: ConnectOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000,
};

export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri, dbOptions);
    console.log('✅ Database Connected Successfully');
  } catch (err) {
    console.error('❌ Critical Error: Failed to connect to database');
    console.error(err);
    process.exit(1);
  }
};
