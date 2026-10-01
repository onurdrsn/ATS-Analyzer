import { z } from 'zod';
import { LanguageSchema } from './language.schema.js';
import { ResumeStructureSchema } from './resume.schema.js';
import { SubScoresSchema, GapItemSchema } from './analysis.schema.js';

export const BatchJobItemSchema = z
  .object({
    id: z.string().optional(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    jobUrl: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string().url('Invalid URL format').optional()
    ),
    jobText: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasUrl = Boolean(data.jobUrl && data.jobUrl.trim().length > 0);
      const hasText = Boolean(data.jobText && data.jobText.trim().length > 0);
      return hasUrl || hasText;
    },
    {
      message: 'Either jobUrl or jobText must be provided',
      path: ['jobUrl'],
    }
  );
export type BatchJobItem = z.infer<typeof BatchJobItemSchema>;

export const BatchAnalysisRequestSchema = z.object({
  resumeData: ResumeStructureSchema,
  language: LanguageSchema.default('en'),
  saveToAccount: z.boolean().optional().default(false),
  jobs: z
    .array(BatchJobItemSchema)
    .min(1, 'At least 1 job posting is required for batch comparison')
    .max(5, 'Batch requests are capped at a maximum of 5 job postings'),
});
export type BatchAnalysisRequest = z.infer<typeof BatchAnalysisRequestSchema>;

export const BatchAnalysisResultItemSchema = z.object({
  jobIndex: z.number().int().min(0),
  jobId: z.string().optional(),
  jobTitle: z.string(),
  company: z.string().optional(),
  overallScore: z.number().min(0).max(100),
  subScores: SubScoresSchema,
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  gaps: z.array(GapItemSchema).or(z.array(z.any())).default([]),
  error: z.string().optional(),
});
export type BatchAnalysisResultItem = z.infer<typeof BatchAnalysisResultItemSchema>;

export const BatchAnalysisResponseSchema = z.object({
  success: z.boolean(),
  results: z.array(BatchAnalysisResultItemSchema),
  totalJobs: z.number().int().min(0),
  processedJobs: z.number().int().min(0).optional(),
  errors: z
    .array(
      z.object({
        jobIndex: z.number(),
        error: z.string(),
      })
    )
    .optional(),
});
export type BatchAnalysisResponse = z.infer<typeof BatchAnalysisResponseSchema>;
