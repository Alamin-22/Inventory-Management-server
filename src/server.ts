import { connectToDatabase } from '@config/db';
import { server } from './app/app';
import { config } from './config/env';
import { seedSuperAdmin } from '@app/modules/initial/seedSuperAdmin';

const port = config.port;

const main = async (): Promise<void> => {
  try {
    await connectToDatabase();

    // Seed the initial admin user
    await seedSuperAdmin();

    // =================================================================
    // CRON JOB INITIALIZATION (SCALABILITY HANDLER)
    // =================================================================
    // const shouldRunCron = process.env.RUN_CRON_JOBS === 'false' ? false : true;

    // if (shouldRunCron) {
    //   // No longer need to pass the connections map
    //   initializeCronJobs();
    // } else {
    //   console.log('⚠️ Cron Jobs DISABLED on this instance (API Only Mode)');
    // }
    // =================================================================

    server.listen(port, () => {
      console.log(`\n🚀 Inventory System Server Running!`);
      console.log(`- Port: ${port}`);
      console.log(`- Env: ${config.environment}`);
      // console.log(`- Cron Jobs: ${shouldRunCron ? 'ACTIVE' : 'DISABLED'}`);
    });
  } catch (error) {
    console.error(`❌ Server Startup Failed:`, error);
    process.exit(1);
  }
};

main();
