export const SubjectOptions = [
  'general-inquiry',
  'product-details-query',
  'order-status-tracking',
  'payment-billing-issue',
  'technical-troubleshooting',
  'corporate-bulk-order',
  'other',
] as const;

export type TSubject = (typeof SubjectOptions)[number];

export const InquiryStatusOptions = ['pending', 'contacted', 'resolved', 'junk'] as const;

export type TInquiryStatus = (typeof InquiryStatusOptions)[number];

export interface IContactForm {
  name: string;
  contactNumber: string;
  email: string;
  subject: TSubject;
  otherSubject?: string;
  message: string;
  storePreference: string;
  status: TInquiryStatus;
}
