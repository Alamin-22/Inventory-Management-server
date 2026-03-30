import { connections, connectToDatabases } from '@config/db';
import { server } from './app/app';
import { config } from './config/env';
import { seedSuperAdmin } from '@app/modules/initial/seedSuperAdmin';
import { initializeCronJobs } from './corn_jobs/cronjob';
import { seedSiteContent } from '@app/modules/initial/seedSiteContent';

const port = config.port;

const main = async (): Promise<void> => {
  try {
    await connectToDatabases();

    if (connections.bringByAir) {
      await seedSuperAdmin(connections.bringByAir, 'bringByAir');
      await seedSiteContent(connections.bringByAir, 'bringByAir');
    }
    if (connections.pandaBD) {
      await seedSuperAdmin(connections.pandaBD, 'pandaBD');
      await seedSiteContent(connections.pandaBD, 'pandaBD');
    }

    // =================================================================
    // CRON JOB INITIALIZATION (SCALABILITY HANDLER)
    // =================================================================
    /**
     * ARCHITECTURE NOTE FOR SCALING:
     * Currently, we run Cron Jobs directly on this server instance.
     * * FUTURE TODO: When scaling to multiple server instances (e.g., Load Balancer, Kubernetes):
     * 1. Set `RUN_CRON_JOBS=false` on all "Traffic Handling" instances.
     * 2. Spin up ONE dedicated small instance with `RUN_CRON_JOBS=true`.
     * * This prevents multiple servers from running the same job (sending duplicate emails).
     */

    // Default to true if not specified (for current single-server setup)
    const shouldRunCron = process.env.RUN_CRON_JOBS === 'false' ? false : true;

    if (shouldRunCron) {
      // Pass the ENTIRE connections map so the cron job can pick the right DB
      initializeCronJobs(connections);
    } else {
      console.log('⚠️ Cron Jobs DISABLED on this instance (API Only Mode)');
    }
    // =================================================================

    server.listen(port, () => {
      console.log(`\n🚀 Dual-Core Server Running!`);
      console.log(`- Port: ${port}`);
      console.log(`- Env: ${config.environment}`);
      console.log(`- Brands Active: BringByAir, PandaBD`);
      console.log(`- Cron Jobs: ${shouldRunCron ? 'ACTIVE' : 'DISABLED'}`);
    });
  } catch (error) {
    console.error(`❌ Server Startup Failed:`, error);
    process.exit(1);
  }
};

main();
