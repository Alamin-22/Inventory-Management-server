/* eslint-disable @typescript-eslint/no-explicit-any */
import { TBrand } from '../auth/auth.interface';
import { IContactForm } from './Common.interface';
import { getContactInquiryModel } from './Common.model';
import { sendEmail } from '@utils/sendEmail';
import { getBrandConfig } from '../Order/Order.email';
import { addFileToQueue, uploadUniqueFiles } from '../products/product.utils';
import ContactUsNotificationTemplate from '@app/Email_Templates/Contact-Related/ContactUsNotificationTemplate';
import { QueryBuilder } from '@app/classes/QueryBuilder';

export const CommonServices = (connection: Connection, storePreference: TBrand) => {
  const ContactInquiryModel = getContactInquiryModel(connection);
  const NewsLetterModel = getNewsLetterModel(connection);

  const uploadMediaToCloud = async (files: any[]) => {
    if (!files || files.length === 0) return [];

    const uniqueFilesToUpload = new Map<string, any>();
    const slugIdentifier = `attachment-${storePreference.toLowerCase()}`;

    files.forEach((file) => {
      addFileToQueue(file, uniqueFilesToUpload);
    });

    const urlMap = await uploadUniqueFiles(storePreference, slugIdentifier, uniqueFilesToUpload, 'Attachments');

    return Array.from(urlMap.values());
  };

  const sendContactInquiryEmail = async (payload: IContactForm) => {
    const brandConfig = getBrandConfig(storePreference);

    // Persistence with tenant scoping
    const inquiry = await ContactInquiryModel.create({
      ...payload,
      storePreference,
    });

    const displaySubject =
      payload.subject === 'other' ? payload.otherSubject : payload.subject.replace(/-/g, ' ').toUpperCase();

    const emailSubject = `[${brandConfig.companyName}] New Inquiry: ${displaySubject}`;

    const templateProps = {
      ...payload,
      subject: displaySubject as string,
      companyName: brandConfig.companyName,
      companyLogo: brandConfig.companyLogoUrl,
      themeColor: brandConfig.themeColor,
    };

    const emailHtml = ContactUsNotificationTemplate(templateProps);

    await sendEmail(brandConfig.adminEmails, emailSubject, emailHtml, storePreference);

    return inquiry;
  };

  const getAllInquiriesFromDB = async (query: Record<string, any>) => {
    const inquiryQuery = new QueryBuilder(ContactInquiryModel, {
      ...query,
      storePreference,
    })
      .filter()
      .sort()
      .paginate()
      .limitFields();

    const result = await inquiryQuery.exec();
    const meta = await inquiryQuery.getQueryMeta();

    return { result, meta };
  };

  const updateInquiryStatus = async (id: string, status: string) => {
    const result = await ContactInquiryModel.findOneAndUpdate(
      { _id: id, storePreference },
      { status },
      { new: true, runValidators: true },
    );
    return result;
  };

  const bulkDeleteInquiriesFromDB = async (ids: string[]) => {
    if (!ids || ids.length === 0) return { deletedCount: 0 };

    const validIds = ids.map((id) => new Types.ObjectId(id));

    const inquiriesToDelete = await ContactInquiryModel.find({
      _id: { $in: validIds },
      storePreference,
    }).select('email');

    const emailsToCleanup = inquiriesToDelete.map((inquiry) => inquiry.email);

    const result = await ContactInquiryModel.deleteMany({
      _id: { $in: validIds },
      storePreference,
    });

    //  Cascade Cleanup: Remove from Newsletter ONLY if source is 'contact-form'
    if (emailsToCleanup.length > 0) {
      await NewsLetterModel.deleteMany({
        email: { $in: emailsToCleanup },
        source: 'contact-form',
        storePreference,
      });
    }

    return result;
  };

  return {
    uploadMediaToCloud,
    sendContactInquiryEmail,
    getAllInquiriesFromDB,
    updateInquiryStatus,
    bulkDeleteInquiriesFromDB,
  };
};
