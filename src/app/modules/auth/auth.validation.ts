import { z } from 'zod';

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
    verificationToken: z.string().optional(),
  }),
});
