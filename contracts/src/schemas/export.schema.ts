import { z } from 'zod';
import { LanguageSchema } from './language.schema.js';
import { ResumeStructureSchema } from './resume.schema.js';

export const EXPORT_FORMATS = ['pdf', 'docx', 'tex'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const ExportFormatSchema = z.enum(EXPORT_FORMATS);

export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  tex: 'application/x-tex',
};

export const ExportResumeRequestSchema = z.object({
  resumeData: ResumeStructureSchema,
  format: ExportFormatSchema,
  language: LanguageSchema.default('en'),
  template: z.enum(['standard', 'modern', 'compact']).optional().default('standard'),
  filename: z.string().optional(),
});
export type ExportResumeRequest = z.infer<typeof ExportResumeRequestSchema>;

export const ExportResumeResponseSchema = z.object({
  success: z.boolean(),
  format: ExportFormatSchema,
  language: LanguageSchema,
  filename: z.string(),
  downloadUrl: z.string().optional(),
  contentBase64: z.string().optional(),
});
export type ExportResumeResponse = z.infer<typeof ExportResumeResponseSchema>;
