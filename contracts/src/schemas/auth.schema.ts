import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof LoginSchema>;
export type LoginRequest = LoginInput;

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type RegisterRequest = RegisterInput;

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type ResetPasswordRequestInput = z.infer<typeof ResetPasswordRequestSchema>;
export type ResetPasswordRequest = ResetPasswordRequestInput;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ResetPassword = ResetPasswordInput;
