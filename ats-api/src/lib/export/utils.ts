import { DEFAULT_SECTION_TITLES, type Language, type LocalizedSectionTitles } from '@ats-analyzer/contracts';

export function resolveSectionTitles(
  language: Language,
  customTitles?: LocalizedSectionTitles
): Required<LocalizedSectionTitles> {
  const defaults = DEFAULT_SECTION_TITLES[language] || DEFAULT_SECTION_TITLES.en;
  return {
    contact: customTitles?.contact || defaults.contact,
    summary: customTitles?.summary || defaults.summary,
    experience: customTitles?.experience || defaults.experience,
    education: customTitles?.education || defaults.education,
    skills: customTitles?.skills || defaults.skills,
    projects: customTitles?.projects || defaults.projects,
  };
}

export function formatPresentDate(language: Language): string {
  return language === 'tr' ? 'Devam Ediyor' : 'Present';
}

export function sanitizeFilename(name: string, language: Language, extension: string): { ascii: string; utf8: string } {
  const base = name ? name.trim().replace(/\s+/g, '_') : 'resume';
  const rawFilename = `${base}_${language}.${extension}`;
  const asciiFilename = rawFilename
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return {
    ascii: asciiFilename,
    utf8: encodeURIComponent(rawFilename).replace(/'/g, '%27'),
  };
}

export function escapeLatex(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\x00BS\x00')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\x00BS\x00/g, '\\textbackslash{}');
}
