import { z } from 'zod';
import { InquiryStatusOptions, SubjectOptions } from './Common.interface';

const sendContactInquirySchema = z.object({
  body: z
    .object({
      name: z.string().min(1, 'Name is required').max(100),
      contactNumber: z.string().regex(/^[0-9+\-\s]{7,20}$/, 'Invalid phone number format'),
      email: z.string().email('Invalid email address'),
      subject: z.enum(SubjectOptions as unknown as [string, ...string[]]),
      otherSubject: z.string().max(200).optional(),
      message: z.string().min(10, 'Message must be at least 10 characters').max(3000),
    })
    .refine(
      (data) => {
        // If subject is 'other', otherSubject MUST be provided
        if (data.subject === 'other' && (!data.otherSubject || data.otherSubject.trim() === '')) {
          return false;
        }
        return true;
      },
      {
        message: 'Please specify your subject in the other field',
        path: ['otherSubject'],
      },
    ),
});

const updateInquiryStatusSchema = z.object({
  body: z.object({
    status: z.enum(InquiryStatusOptions as unknown as [string, ...string[]]),
  }),
});

const bulkDeleteInquiriesSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1, 'Invalid ID')).min(1, 'At least one ID is required'),
  }),
});

export const CommonValidations = {
  sendContactInquirySchema,
  updateInquiryStatusSchema,
  bulkDeleteInquiriesSchema,
};
