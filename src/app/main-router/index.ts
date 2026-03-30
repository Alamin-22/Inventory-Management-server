import { Router } from 'express';
import { AuthRoutes } from '@app/modules/auth/auth.route';
import { UserRoutes } from '@app/modules/user/user.router';
import { CustomerRoutes } from '@app/modules/customer/customer.router';
import { AdminRoutes } from '@app/modules/admin/admin.route';
import { BrandRoutes } from '@app/modules/Brand/Brand.route';
import { ProductRoutes } from '@app/modules/products/product.router';
import { CartRoutes } from '@app/modules/Cart/Cart.route';
import { CouponRoutes } from '@app/modules/Coupon/Coupon.route';
import { OrderRoutes } from '@app/modules/Order/Order.route';
import { ScraperRoutes } from '@app/modules/Scraper/Scraper.routes';
import { TransactionRoutes } from '@app/modules/Payment-Related/Transaction/Transaction.route';
import { PaymentRoutes } from '@app/modules/Payment-Related/Payment/Payment.route';
import { ReviewRoutes } from '@app/modules/ReviewsAndRatings/Review.route';
import { CollectionRoutes } from '@app/modules/Home-PageRelated-Sections/Collections/Collection.route';
import { CategoryRoutes } from '@app/modules/Category/Category.route';
import { CategoryBannerRoutes } from '@app/modules/CategoryRelated/CategoryBanner/CategoryBanner.route';
import { ReturnRequestRoutes } from '@app/modules/ReturnRequest/ReturnRequest.route';
import { WishlistRoutes } from '@app/modules/Wishlist/Wishlist.route';
import { BadgeRoutes } from '@app/modules/Badge/Badge.route';
import { CommonRoutes } from '@app/modules/Common/Common.route';
import { NewsLetterRoutes } from '@app/modules/Promotions/NewsLetter/NewsLetter.route';
import { ProductNotificationRoutes } from '@app/modules/Promotions/ProductNotification/ProductNotification.route';
import { EmailTemplateRoutes } from '@app/modules/Promotions/Templates/Template.route';
import { CampaignRoutes } from '@app/modules/Promotions/Campaign/Campaign.route';
import { GroupBuyRoutes } from '@app/modules/GroupBuy-Related/GroupBuy/GroupBuy.routes';
import { HeroStageRoutes } from '@app/modules/Home-PageRelated-Sections/Hero/HeroStage.routes';
import { auditLogger } from '@app/middlewares/AuditLogger';
import { AuditLogRoutes } from '@app/modules/AuditLog/AuditLog.route';
import { SiteContentRoutes } from '@app/modules/SiteContent/SiteContent.route';

const router = Router();

const moduleRoutes = [
  // Authentication & Core
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/customers',
    route: CustomerRoutes,
  },
  {
    path: '/admins',
    route: AdminRoutes,
  },

  {
    path: '/categories',
    route: CategoryRoutes,
  },
  {
    path: '/category-banner',
    route: CategoryBannerRoutes,
  },
  {
    path: '/brand',
    route: BrandRoutes,
  },

  {
    path: '/badge',
    route: BadgeRoutes,
  },
  {
    path: '/common-api',
    route: CommonRoutes,
  },
  {
    path: '/site-contents',
    route: SiteContentRoutes,
  },

  {
    path: '/products',
    route: ProductRoutes,
  },
  {
    path: '/group-buy',
    route: GroupBuyRoutes,
  },
  {
    path: '/hero-stage',
    route: HeroStageRoutes,
  },
  {
    path: '/return-order-request',
    route: ReturnRequestRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
  {
    /* this is for global search using internal + external products */
    path: '/global',
    route: ScraperRoutes,
  },

  {
    path: '/transactions/payment',
    route: PaymentRoutes,
  },
  {
    path: '/transactions',
    route: TransactionRoutes,
  },

  // {
  // old one
  //   path: '/product-scraping',
  //   route: productScrapingRouter,
  // },

  {
    path: '/collections',
    route: CollectionRoutes,
  },
  {
    path: '/carts',
    route: CartRoutes,
  },
  {
    path: '/wishlist',
    route: WishlistRoutes,
  },
  {
    path: '/coupon',
    route: CouponRoutes,
  },
  {
    path: '/orders',
    route: OrderRoutes,
  },
  {
    path: '/promotions/newsletter',
    route: NewsLetterRoutes,
  },
  {
    path: '/promotions/product-notifications',
    route: ProductNotificationRoutes,
  },
  {
    path: '/promotions/templates',
    route: EmailTemplateRoutes,
  },
  {
    path: '/promotions/campaigns',
    route: CampaignRoutes,
  },
  {
    path: '/audit-logs',
    route: AuditLogRoutes,
  },

  // {
  //   path: '/tracking',
  //   route: TrackingRoutes,
  // },
];

// 1. REGISTER AUTH FIRST (To keep Login/Logout out of the Audit Logs)
const authRoute = moduleRoutes.find((m) => m.path === '/auth');
if (authRoute) {
  router.use(authRoute.path, authRoute.route);
}

const nonAuditedPaths = ['/auth'];

// 2. THE SECURITY CAMERA (Audit Logger)
// It sits here and "watches" all modules below this line.
router.use(auditLogger);

// 3. REGISTER ALL OTHER MODULES
moduleRoutes
  .filter((m) => !nonAuditedPaths.includes(m.path)) // Skip auth since we registered it above
  .forEach(({ path, route }) => {
    router.use(path, route);
  });

export default router;
