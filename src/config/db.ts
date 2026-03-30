import mongoose, { ConnectOptions } from 'mongoose';
import { config } from '../config/env';

// 1. Storage for Active Connections
export const connections = {
  bringByAir: null as mongoose.Connection | null,
  pandaBD: null as mongoose.Connection | null,
};

const dbOptions: ConnectOptions = {
  maxPoolSize: 50, // Maximum 50 "phone lines" per brand
  minPoolSize: 5, // Keep 5 lines open always to avoid "cold start" lag
  socketTimeoutMS: 30000, // Close a query if it hangs for 30 seconds
  serverSelectionTimeoutMS: 5000, // Fail fast if the DB is down
  heartbeatFrequencyMS: 10000, // Check if the connection is alive every 10s
};

// 2. Connector Function
export const connectToDatabases = async (): Promise<void> => {
  try {
    // Connect to Bring By Air
    connections.bringByAir = await mongoose.createConnection(config.bringByAirMongoUri, dbOptions).asPromise();
    console.log('✅ [Bring By Air] Database Connected Successfully');

    // Connect to PandaBD
    connections.pandaBD = await mongoose.createConnection(config.pandaBDMongoUri, dbOptions).asPromise();
    console.log('🐼 [PandaBD] Database Connected Successfully');
  } catch (err) {
    console.error('❌ Critical Error: Failed to connect to databases');
    console.error(err);
    process.exit(1);
  }
};
