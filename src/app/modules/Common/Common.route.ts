import express from 'express';
import { upload } from '@utils/sendMediaToCloudinary';
import { CommonControllers } from './Common.controller';
import { CommonValidations } from './Common.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import { fileCleanupOnFinish } from '@app/middlewares/fileCleanupOnFinish';

const router = express.Router();

//  Submit Contact Inquiry
router.post(
  '/contact-us',
  ValidateRequestMiddleWare(CommonValidations.sendContactInquirySchema),
  CommonControllers.sendContactEmail,
);

//  Media Uploader
router.post(
  '/upload',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.editor),
  upload.array('attachments', 10), // Max 10 files per request
  fileCleanupOnFinish,
  CommonControllers.uploadMedia,
);

//  Get All Inquiries
router.get(
  '/inquiries',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  CommonControllers.getAllInquiries,
);

router.get('/meta/subjects', CommonControllers.getInquirySubjects);

// Update Inquiry Status (Resolve/Contacted/Junk)
router.patch(
  '/inquiries/:id/status',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  ValidateRequestMiddleWare(CommonValidations.updateInquiryStatusSchema),
  CommonControllers.updateInquiryStatus,
);

//  Bulk Delete Inquiries
router.post(
  '/inquiries/bulk-delete',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  ValidateRequestMiddleWare(CommonValidations.bulkDeleteInquiriesSchema),
  CommonControllers.bulkDeleteInquiries,
);

export const CommonRoutes = router;
