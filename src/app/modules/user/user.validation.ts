import { z } from 'zod';

const changeStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'blocked']),
  }),
});

export const UserValidation = {
  changeStatusValidationSchema,
};
