import { z } from 'zod';

export const FetchJobRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
});
export type FetchJobRequest = z.infer<typeof FetchJobRequestSchema>;

export const FetchJobResponseSchema = z.object({
  title: z.string(),
  text: z.string(),
  siteName: z.string().optional(),
});
export type FetchJobResponse = z.infer<typeof FetchJobResponseSchema>;

export const ExtractedJobRequirementsSchema = z.object({
  hard_skills: z.array(z.string()).default([]),
  soft_skills: z.array(z.string()).default([]),
  tech_skills: z.array(z.string()).default([]),
  years_experience_required: z.number().nullable().default(null),
  degree_requirement: z.string().nullable().default(null),
  language_requirements: z.array(z.string()).default([]),
  seniority_level: z.string().default('Mid-Level'),
});
export type ExtractedJobRequirements = z.infer<typeof ExtractedJobRequirementsSchema>;
export type ExtractedJob = ExtractedJobRequirements;
