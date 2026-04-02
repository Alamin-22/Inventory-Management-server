import { Router } from 'express';
import { AuthRoutes } from '@app/modules/auth/auth.route';
import { UserRoutes } from '@app/modules/user/user.router';
import { CustomerRoutes } from '@app/modules/customer/customer.router';
import { AdminRoutes } from '@app/modules/admin/admin.route';
import { CategoryRoutes } from '@app/modules/Category/Category.route';
import { ProductRoutes } from '@app/modules/products/product.router';
import { OrderRoutes } from '@app/modules/Order/Order.route';
import { TransactionRoutes } from '@app/modules/Payment-Related/Transaction/Transaction.route';
import { AuditLogRoutes } from '@app/modules/AuditLog/AuditLog.route';
import { auditLogger } from '@app/middlewares/AuditLogger';
import { AnalyticsRoutes } from '@app/modules/Analytics/Analytics.route';

const router = Router();

const moduleRoutes = [
  // Authentication & Core
  { path: '/auth', route: AuthRoutes },
  { path: '/users', route: UserRoutes },
  { path: '/customers', route: CustomerRoutes },
  { path: '/admins', route: AdminRoutes },

  // Inventory Management Core
  { path: '/categories', route: CategoryRoutes },
  { path: '/products', route: ProductRoutes },
  { path: '/orders', route: OrderRoutes },
  { path: '/transactions', route: TransactionRoutes },
  { path: '/audit-logs', route: AuditLogRoutes },
  { path: '/analytics', route: AnalyticsRoutes },
];

// 1. REGISTER AUTH FIRST (To keep Login/Logout out of the Audit Logs)
const authRoute = moduleRoutes.find((m) => m.path === '/auth');
if (authRoute) {
  router.use(authRoute.path, authRoute.route);
}

const nonAuditedPaths = ['/auth'];

// 2. THE SECURITY CAMERA (Audit Logger)
router.use(auditLogger);

// 3. REGISTER ALL OTHER MODULES
moduleRoutes
  .filter((m) => !nonAuditedPaths.includes(m.path))
  .forEach(({ path, route }) => {
    router.use(path, route);
  });

export default router;
