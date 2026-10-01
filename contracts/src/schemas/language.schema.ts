import { z } from 'zod';

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LanguageSchema = z.enum(SUPPORTED_LANGUAGES);
export type Language = z.infer<typeof LanguageSchema>;

export const DEFAULT_LANGUAGE: Language = 'en';
