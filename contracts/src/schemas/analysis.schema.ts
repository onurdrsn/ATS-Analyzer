import { z } from 'zod';
import { LanguageSchema } from './language.schema.js';
import { ResumeStructureSchema } from './resume.schema.js';
import { ExtractedJobRequirementsSchema } from './job.schema.js';

// Sub-Score Component Schemas
export const KeywordMatchSubScoreSchema = z.object({
  score: z.number().min(0).max(100),
  techMatchRate: z.number().min(0).max(100),
  hardSkillMatchRate: z.number().min(0).max(100),
  softSkillMatchRate: z.number().min(0).max(100),
  matchedTech: z.array(z.string()).default([]),
  missingTech: z.array(z.string()).default([]),
  matchedHard: z.array(z.string()).default([]),
  missingHard: z.array(z.string()).default([]),
  matchedSoft: z.array(z.string()).default([]),
  missingSoft: z.array(z.string()).default([]),
});
export type KeywordMatchSubScore = z.infer<typeof KeywordMatchSubScoreSchema>;

export const FormatParseabilitySubScoreSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.string()).default([]),
  passedChecks: z.array(z.string()).default([]),
});
export type FormatParseabilitySubScore = z.infer<typeof FormatParseabilitySubScoreSchema>;

export const ExperienceFitSubScoreSchema = z.object({
  score: z.number().min(0).max(100),
  yearsRequired: z.number().nullable(),
  yearsEstimated: z.number(),
  feedback: z.string(),
});
export type ExperienceFitSubScore = z.infer<typeof ExperienceFitSubScoreSchema>;

export const SectionCompletenessSubScoreSchema = z.object({
  score: z.number().min(0).max(100),
  missingSections: z.array(z.string()).default([]),
  presentSections: z.array(z.string()).default([]),
});
export type SectionCompletenessSubScore = z.infer<typeof SectionCompletenessSubScoreSchema>;

// Combined SubScores
export const SubScoresSchema = z.object({
  keywordMatch: KeywordMatchSubScoreSchema,
  formatParseability: FormatParseabilitySubScoreSchema,
  experienceFit: ExperienceFitSubScoreSchema,
  sectionCompleteness: SectionCompletenessSubScoreSchema,
});
export type SubScores = z.infer<typeof SubScoresSchema>;

// Gap Fix Status & Item Schemas
export const GapStatusSchema = z.enum(['pending', 'approved', 'edited', 'rejected']);
export type GapStatus = z.infer<typeof GapStatusSchema>;

export const GapItemSchema = z.object({
  id: z.string().optional(),
  originalBullet: z.string(),
  suggestedBullet: z.string(),
  editedBullet: z.string().optional(),
  reason: z.string().optional(),
  status: GapStatusSchema.default('pending'),
});
export type GapItem = z.infer<typeof GapItemSchema>;

// Overall Score Result
export const ScoreResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  subScores: SubScoresSchema,
  transparencyNote: z.string().default(''),
  matchedSkills: z.array(z.string()).optional().default([]),
  missingSkills: z.array(z.string()).optional().default([]),
  gaps: z.array(GapItemSchema).optional().default([]),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;

// Single Analysis Request & Response
export const SingleAnalysisRequestSchema = z
  .object({
    resumeData: ResumeStructureSchema,
    jobUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
    jobText: z.string().optional(),
    language: LanguageSchema.default('en'),
    saveToAccount: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      const hasUrl = Boolean(data.jobUrl && data.jobUrl.trim().length > 0);
      const hasText = Boolean(data.jobText && data.jobText.trim().length >= 50);
      return hasUrl || hasText;
    },
    {
      message: 'Either a valid jobUrl or jobText (minimum 50 characters) must be provided',
      path: ['jobText'],
    }
  );
export type SingleAnalysisRequest = z.infer<typeof SingleAnalysisRequestSchema>;

export const SingleAnalysisResponseSchema = z.object({
  analysisId: z.number().nullable().optional(),
  scoreResult: ScoreResultSchema,
  extractedRequirements: ExtractedJobRequirementsSchema.optional(),
  jobText: z.string().optional(),
  success: z.boolean().optional().default(true),
});
export type SingleAnalysisResponse = z.infer<typeof SingleAnalysisResponseSchema>;

// Gap Fix Rewrite Schemas
export const RewriteBulletRequestSchema = z.object({
  originalBullet: z.string().min(1, 'Original bullet is required'),
  missingSkill: z.string().min(1, 'Missing skill is required'),
});
export type RewriteBulletRequest = z.infer<typeof RewriteBulletRequestSchema>;

export const RewriteBulletResponseSchema = z.object({
  original: z.string(),
  skill: z.string(),
  suggestion: z.string(),
});
export type RewriteBulletResponse = z.infer<typeof RewriteBulletResponseSchema>;
