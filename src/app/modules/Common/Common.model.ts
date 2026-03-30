import { Connection, Schema } from 'mongoose';
import { IContactForm, SubjectOptions, InquiryStatusOptions } from './Common.interface';

const contactInquirySchema = new Schema<IContactForm>(
  {
    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, enum: SubjectOptions, required: true },
    otherSubject: { type: String, trim: true },
    message: { type: String, required: true },
    storePreference: { type: String, required: true },
    status: {
      type: String,
      enum: InquiryStatusOptions,
      default: 'pending',
    },
  },
  { timestamps: true },
);

contactInquirySchema.index({ storePreference: 1, status: 1 });
contactInquirySchema.index({ email: 1, status: 1 });
contactInquirySchema.index({ createdAt: -1 });

export const getContactInquiryModel = (connection: Connection) => {
  return connection.model<IContactForm>('ContactInquiry', contactInquirySchema);
};
