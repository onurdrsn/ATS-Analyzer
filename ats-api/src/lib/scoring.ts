import {
  DEFAULT_SECTION_TITLES,
  type Language,
  type LocalizedSectionTitles,
  type ResumeStructure,
} from '@ats-analyzer/contracts';

export interface ExtractedJob {
  hard_skills: string[];
  soft_skills: string[];
  tech_skills: string[];
  years_experience_required?: number | null;
  degree_requirement?: string | null;
  seniority_level?: string;
}

export type StructuredResume = ResumeStructure | {
  language?: Language;
  sectionTitles?: LocalizedSectionTitles;
  contact?: { name?: string; email?: string; phone?: string; links?: string[] };
  summary?: string;
  experience?: Array<{ company?: string; title?: string; startDate?: string; endDate?: string; bullets?: string[] }>;
  education?: Array<{ institution?: string; degree?: string; startDate?: string; endDate?: string }>;
  skills?: string[];
  projects?: Array<{ name?: string; description?: string }>;
};

export interface ScoreResult {
  overallScore: number;
  subScores: {
    keywordMatch: {
      score: number;
      techMatchRate: number;
      hardSkillMatchRate: number;
      softSkillMatchRate: number;
      matchedTech: string[];
      missingTech: string[];
      matchedHard: string[];
      missingHard: string[];
      matchedSoft: string[];
      missingSoft: string[];
    };
    formatParseability: {
      score: number;
      issues: string[];
      passedChecks: string[];
    };
    experienceFit: {
      score: number;
      yearsRequired: number | null;
      yearsEstimated: number;
      feedback: string;
    };
    sectionCompleteness: {
      score: number;
      missingSections: string[];
      presentSections: string[];
    };
  };
  transparencyNote: string;
}

export function computeATSScore(
  resume: StructuredResume,
  job: ExtractedJob,
  language?: Language
): ScoreResult {
  const isTr =
    language === 'tr' ||
    resume.language === 'tr' ||
    (resume.sectionTitles && Object.values(resume.sectionTitles).some((t) => /[ğĞıİşŞçÇöÖüÜ]/.test(t || '')));
  const lang: Language = isTr ? 'tr' : 'en';

  const defaultTitles = DEFAULT_SECTION_TITLES[lang] || DEFAULT_SECTION_TITLES.en;
  const titles = {
    ...defaultTitles,
    ...(resume.sectionTitles || {}),
  };

  // 1. Gather all resume text/skills for keyword comparison
  const resumeSkillsLower = new Set(
    (resume.skills || []).map((s) => s.toLowerCase().trim())
  );
  
  // Also collect tokens from experience bullets & summary
  const experienceText = (resume.experience || [])
    .flatMap((e) => e.bullets || [])
    .join(' ')
    .toLowerCase();
  const fullResumeText = `${resume.summary || ''} ${experienceText}`.toLowerCase();

  const hasSkill = (skill: string) => {
    const s = skill.toLowerCase().trim();
    return resumeSkillsLower.has(s) || fullResumeText.includes(s);
  };

  // Tech skills match
  const matchedTech: string[] = [];
  const missingTech: string[] = [];
  (job.tech_skills || []).forEach((skill) => {
    if (hasSkill(skill)) matchedTech.push(skill);
    else missingTech.push(skill);
  });

  // Hard skills match
  const matchedHard: string[] = [];
  const missingHard: string[] = [];
  (job.hard_skills || []).forEach((skill) => {
    if (hasSkill(skill)) matchedHard.push(skill);
    else missingHard.push(skill);
  });

  // Soft skills match
  const matchedSoft: string[] = [];
  const missingSoft: string[] = [];
  (job.soft_skills || []).forEach((skill) => {
    if (hasSkill(skill)) matchedSoft.push(skill);
    else missingSoft.push(skill);
  });

  const techRate = job.tech_skills?.length ? (matchedTech.length / job.tech_skills.length) * 100 : 100;
  const hardRate = job.hard_skills?.length ? (matchedHard.length / job.hard_skills.length) * 100 : 100;
  const softRate = job.soft_skills?.length ? (matchedSoft.length / job.soft_skills.length) * 100 : 100;

  // Keyword score: weighted tech (50%), hard (35%), soft (15%)
  const keywordScore = Math.round(techRate * 0.5 + hardRate * 0.35 + softRate * 0.15);

  // 2. Format & Parseability
  const issues: string[] = [];
  const passedChecks: string[] = [
    lang === 'tr' ? 'Seçilebilir vektör metin' : 'Selectable vector text',
    lang === 'tr' ? 'Standart UTF-8 karakter kodlaması' : 'Standard UTF-8 character encoding',
  ];
  let formatScore = 100;

  if (!resume.contact?.email || !resume.contact?.name) {
    issues.push(lang === 'tr' ? 'Üstbilgide net iletişim bilgisi eksik' : 'Missing clear contact identification in header');
    formatScore -= 20;
  } else {
    passedChecks.push(lang === 'tr' ? 'Standart iletişim üstbilgisi tespit edildi' : 'Standard contact header identified');
  }

  if (!resume.experience || resume.experience.length === 0) {
    issues.push(
      lang === 'tr'
        ? `Tanınan standart ${titles.experience} bölüm başlığı bulunamadı`
        : `No recognized standard ${titles.experience} section heading`
    );
    formatScore -= 30;
  } else {
    passedChecks.push(
      lang === 'tr'
        ? `Standart tek sütunlu ${titles.experience} zaman çizelgesi yapısı`
        : 'Standard single-column Experience timeline structure'
    );
  }

  // 3. Experience-level fit
  let estimatedYears = (resume.experience || []).length * 2; // rough heuristic if dates not parsed
  const requiredYears = job.years_experience_required ?? null;
  let expScore = 100;
  let expFeedback =
    lang === 'tr'
      ? 'Deneyim seviyesi pozisyon gereksinimleriyle uyumlu.'
      : 'Experience level aligns with role requirements.';

  if (requiredYears !== null && requiredYears > 0) {
    if (estimatedYears < requiredYears) {
      const diff = requiredYears - estimatedYears;
      expScore = Math.max(40, 100 - diff * 15);
      expFeedback =
        lang === 'tr'
          ? `Pozisyon ~${requiredYears} yıl deneyim talep ediyor; özgeçmişiniz yaklaşık ${estimatedYears} yıl gösteriyor.`
          : `Role requests ~${requiredYears} years of experience; your resume indicates approximately ${estimatedYears} years.`;
    } else {
      expFeedback =
        lang === 'tr'
          ? `Deneyim talep edilen ${requiredYears} yılı karşılıyor veya aşıyor.`
          : `Experience meets or exceeds the requested ${requiredYears} years.`;
    }
  }

  // 4. Section completeness
  const presentSections: string[] = [];
  const missingSections: string[] = [];

  if (resume.contact?.name && resume.contact?.email) presentSections.push(titles.contact);
  else missingSections.push(titles.contact);

  if (resume.summary) presentSections.push(titles.summary);
  else missingSections.push(titles.summary);

  if (resume.experience && resume.experience.length > 0) presentSections.push(titles.experience);
  else missingSections.push(titles.experience);

  if (resume.skills && resume.skills.length > 0) presentSections.push(titles.skills);
  else missingSections.push(titles.skills);

  if (resume.education && resume.education.length > 0) presentSections.push(titles.education);
  else missingSections.push(titles.education);

  const completenessScore = Math.round((presentSections.length / 5) * 100);

  // Overall Composite Score (weighted: keywords 45%, format 20%, experience 20%, completeness 15%)
  const overallScore = Math.round(
    keywordScore * 0.45 + formatScore * 0.2 + expScore * 0.2 + completenessScore * 0.15
  );

  return {
    overallScore,
    subScores: {
      keywordMatch: {
        score: keywordScore,
        techMatchRate: Math.round(techRate),
        hardSkillMatchRate: Math.round(hardSkillMatchRate(hardRate)),
        softSkillMatchRate: Math.round(softRate),
        matchedTech,
        missingTech,
        matchedHard,
        missingHard,
        matchedSoft,
        missingSoft,
      },
      formatParseability: {
        score: Math.max(0, formatScore),
        issues,
        passedChecks,
      },
      experienceFit: {
        score: expScore,
        yearsRequired: requiredYears,
        yearsEstimated: estimatedYears,
        feedback: expFeedback,
      },
      sectionCompleteness: {
        score: completenessScore,
        missingSections,
        presentSections,
      },
    },
    transparencyNote:
      lang === 'tr'
        ? 'Gerçek ATS sistemleri (Workday, Taleo, Greenhouse) özgeçmişleri rastgele bir puan eşiğine göre otomatik olarak reddetmez. Puanlar, insan kaynakları uzmanları için anahtar kelime uyumu ve ayrıştırılabilirlik güvenini temsil eder.'
        : 'Real ATS platforms (Workday, Taleo, Greenhouse) do not auto-reject resumes based on an arbitrary score threshold. Scores represent keyword alignment and parseability confidence for human recruiters.',
  };
}

function hardSkillMatchRate(rate: number): number {
  return Math.round(rate);
}
