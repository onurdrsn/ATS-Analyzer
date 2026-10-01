import { z } from 'zod';
import { LanguageSchema, type Language } from './language.schema.js';

// Localized Section Titles
export const LocalizedSectionTitlesSchema = z.object({
  contact: z.string().optional(),
  summary: z.string().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  skills: z.string().optional(),
  projects: z.string().optional(),
});
export type LocalizedSectionTitles = z.infer<typeof LocalizedSectionTitlesSchema>;

export const DEFAULT_SECTION_TITLES: Record<Language, Required<LocalizedSectionTitles>> = {
  en: {
    contact: 'Contact Information',
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
  },
  tr: {
    contact: 'İletişim Bilgileri',
    summary: 'Profesyonel Özet',
    experience: 'İş Deneyimi',
    education: 'Eğitim',
    skills: 'Yetenekler',
    projects: 'Projeler',
  },
};

// Sub-schemas with inferred types
export const ResumeContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  links: z.array(z.string()).default([]),
});
export type ResumeContact = z.infer<typeof ResumeContactSchema>;
export const ContactInfoSchema = ResumeContactSchema;
export type ContactInfo = ResumeContact;

export const ResumeExperienceSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  title: z.string().min(1, 'Job title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  description: z.string().optional().default(''),
  bullets: z.array(z.string()).default([]),
});
export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;
export const ExperienceItemSchema = ResumeExperienceSchema;
export type ExperienceItem = ResumeExperience;

export const ResumeEducationSchema = z.object({
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
});
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export const EducationItemSchema = ResumeEducationSchema;
export type EducationItem = ResumeEducation;

export const ResumeProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().default(''),
  link: z.string().optional(),
});
export type ResumeProject = z.infer<typeof ResumeProjectSchema>;
export const ProjectItemSchema = ResumeProjectSchema;
export type ProjectItem = ResumeProject;

// Full Structured Resume Schema
export const ResumeStructureSchema = z.object({
  language: LanguageSchema.optional().default('en'),
  sectionTitles: LocalizedSectionTitlesSchema.optional(),
  contact: ResumeContactSchema,
  summary: z.string().default(''),
  experience: z.array(ResumeExperienceSchema).default([]),
  education: z.array(ResumeEducationSchema).default([]),
  skills: z.array(z.string()).default([]),
  projects: z.array(ResumeProjectSchema).optional().default([]),
});
export type ResumeStructure = z.infer<typeof ResumeStructureSchema>;
export type StructuredResume = ResumeStructure;

// Bilingual Dual-Language Resume Schema
export const BilingualResumeSchema = z
  .object({
    en: ResumeStructureSchema.optional(),
    tr: ResumeStructureSchema.optional(),
    activeLanguage: LanguageSchema.default('en'),
  })
  .refine((data) => Boolean(data.en || data.tr), {
    message: 'At least one language version (en or tr) must be provided',
  });
export type BilingualResume = z.infer<typeof BilingualResumeSchema>;
