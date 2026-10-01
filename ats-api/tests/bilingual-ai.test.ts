import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage,
  extractJobRequirementsHeuristic,
  suggestRewrite,
  extractSkills,
} from '../src/lib/ai.js';
import { computeATSScore } from '../src/lib/scoring.js';
import { DEFAULT_SECTION_TITLES, type ResumeStructure } from '@ats-analyzer/contracts';
import app from '../src/index.js';

const sampleTurkishJobPosting = `
GENEL NİTELİKLER VE İŞ TANIMI

İstanbul merkezli fintech şirketimizde görevlendirilmek üzere aşağıdaki niteliklere sahip Kıdemli Full Stack Yazılım Mühendisi arıyoruz.

ADAY KRİTERLERİ:
- Üniversitelerin Bilgisayar Mühendisliği, Yazılım Mühendisliği veya ilgili lisans bölümlerinden mezun,
- En az 4 yıl yazılım geliştirme tecrübesine sahip,
- React, TypeScript, Node.js ve PostgreSQL veritabanı teknolojilerinde yetkin,
- Docker ve CI/CD süreçleri konusunda deneyimli,
- RESTful API tasarımı ve mikroservis mimarisi prensiplerine hakim,
- İleri seviyede İngilizce bilen,
- Problem çözme ve analitik düşünme yeteneği gelişmiş, takım çalışmasına yatkın.

İŞ TANIMI:
- Yüksek trafikli finansal ödeme sistemlerinin mimarisinin tasarlanması ve geliştirilmesi,
- Mikroservislerin performans optimizasyonunun sağlanması ve birim testlerinin yazılması.
`;

const sampleEnglishJobPosting = `
Job Title: Senior Backend Engineer
Company: CloudScale Technologies
Location: Remote

Job Description:
We are seeking an experienced Senior Backend Engineer to join our core platform engineering team.

Qualifications & Requirements:
- Bachelor's degree in Computer Science, Software Engineering, or equivalent practical experience.
- At least 5 years of professional backend software development experience.
- Deep expertise in Go, Python, and PostgreSQL databases.
- Hands-on experience with Docker, Kubernetes, and AWS cloud infrastructure.
- Solid background in RESTful API design, microservices architecture, and unit testing.
- Strong problem solving, analytical thinking, and effective communication skills.
`;

const turkishResume: ResumeStructure = {
  language: 'tr',
  contact: {
    name: 'Canan Demir',
    email: 'canan.demir@ornek.com',
    phone: '+90 533 111 2233',
    links: ['https://linkedin.com/in/canandemir'],
  },
  summary: 'React, Node.js ve mikroservis mimarisi üzerine 5 yıllık deneyime sahip Kıdemli Yazılım Mühendisi.',
  experience: [
    {
      company: 'PayTech Finansal Teknolojiler',
      title: 'Kıdemli Yazılım Geliştirici',
      startDate: '2021-02',
      endDate: '2024-05',
      description: 'RESTful API ve mikroservis mimarisi geliştirme.',
      bullets: [
        'React ve Node.js ile yüksek performanslı ödeme sistemleri geliştirildi',
        'PostgreSQL veritabanı optimizasyonları ile sorgu süreleri %40 iyileştirildi',
        'Docker konteynerleri ve CI/CD süreçleri ile birim test kapsamı genişletildi',
      ],
    },
  ],
  education: [
    {
      institution: 'Orta Doğu Teknik Üniversitesi',
      degree: 'Bilgisayar Mühendisliği Lisans',
      startDate: '2016-09',
      endDate: '2020-06',
    },
  ],
  skills: [
    'TypeScript',
    'React',
    'Node.js',
    'PostgreSQL',
    'Docker',
    'RESTful API Tasarımı',
    'Mikroservis Mimarisi',
    'Problem Çözme',
    'Takım Çalışması',
  ],
  projects: [
    {
      name: 'Ödeme Ağ Geçidi',
      description: 'Mikroservis tabanlı açık kaynaklı ödeme motoru.',
    },
  ],
};

const englishResume: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'Alex Mercer',
    email: 'alex.mercer@example.com',
    phone: '+1-555-4321',
    links: ['https://github.com/alexmercer'],
  },
  summary: 'Senior Backend Engineer with 5+ years of experience building distributed systems in Go and Python.',
  experience: [
    {
      company: 'Nexus Cloud Platforms',
      title: 'Senior Backend Engineer',
      startDate: '2020-03',
      endDate: '2024-06',
      description: 'Core backend microservices and distributed storage engines.',
      bullets: [
        'Designed high-throughput RESTful APIs using Go and PostgreSQL',
        'Deployed containerized services with Docker and Kubernetes on AWS',
      ],
    },
  ],
  education: [
    {
      institution: 'University of Washington',
      degree: 'B.S. in Computer Science',
      startDate: '2015-09',
      endDate: '2019-06',
    },
  ],
  skills: [
    'Go',
    'Python',
    'PostgreSQL',
    'Docker',
    'Kubernetes',
    'AWS',
    'RESTful API Design',
    'Microservices Architecture',
    'Problem Solving',
  ],
  projects: [
    {
      name: 'Distributed Lock Manager',
      description: 'Raft consensus based distributed locking library in Go.',
    },
  ],
};

describe('Bilingual AI & Heuristic Parser Test Suite', () => {
  describe('Language Detection (detectLanguage)', () => {
    it('detects Turkish language from standard Turkish characters and keywords', () => {
      const detected = detectLanguage(sampleTurkishJobPosting);
      assert.strictEqual(detected, 'tr');
    });

    it('detects Turkish even with unaccented / ASCII Turkish job posting keywords', () => {
      const asciiTurkishText = `
        Genel nitelikler ve is tanimi:
        Sirketimizde calismak uzere en az 3 yil tecrubeli yazilimci ariyoruz.
        Universitelerin lisans mezunu adaylar basvurabilir. Askerlik ile ilisigi bulunmayan.
      `;
      const detected = detectLanguage(asciiTurkishText);
      assert.strictEqual(detected, 'tr');
    });

    it('detects English language from English job posting markers', () => {
      const detected = detectLanguage(sampleEnglishJobPosting);
      assert.strictEqual(detected, 'en');
    });

    it('defaults to English when input is empty or ambiguous', () => {
      assert.strictEqual(detectLanguage(''), 'en');
      assert.strictEqual(detectLanguage('   '), 'en');
      assert.strictEqual(detectLanguage('Hello World'), 'en');
    });
  });

  describe('Turkish Job Heuristic Extraction (Kariyer.net conventions)', () => {
    it('extracts structured requirements from Turkish job listing correctly', () => {
      const extracted = extractJobRequirementsHeuristic(sampleTurkishJobPosting, 'tr');

      // Experience years
      assert.strictEqual(extracted.years_experience_required, 4);

      // Degree requirement
      assert.ok(extracted.degree_requirement?.includes('Lisans'));

      // Seniority level
      assert.strictEqual(extracted.seniority_level, 'Senior');

      // Tech skills
      assert.ok(extracted.tech_skills.includes('React'));
      assert.ok(extracted.tech_skills.includes('TypeScript'));
      assert.ok(extracted.tech_skills.includes('Node.js'));
      assert.ok(extracted.tech_skills.includes('PostgreSQL'));
      assert.ok(extracted.tech_skills.includes('Docker'));

      // Hard skills in Turkish
      assert.ok(extracted.hard_skills.includes('RESTful API Tasarımı'));
      assert.ok(extracted.hard_skills.includes('Mikroservis Mimarisi'));

      // Soft skills in Turkish
      assert.ok(extracted.soft_skills.includes('Problem Çözme'));
      assert.ok(extracted.soft_skills.includes('Takım Çalışması'));
      assert.ok(extracted.soft_skills.includes('Analitik Düşünme'));

      // Language requirements
      assert.ok(extracted.language_requirements.includes('English'));
    });
  });

  describe('English Job Heuristic Extraction', () => {
    it('extracts structured requirements from English job listing correctly', () => {
      const extracted = extractJobRequirementsHeuristic(sampleEnglishJobPosting, 'en');

      // Experience years
      assert.strictEqual(extracted.years_experience_required, 5);

      // Seniority
      assert.strictEqual(extracted.seniority_level, 'Senior');

      // Degree requirement
      assert.ok(extracted.degree_requirement?.includes("Bachelor's"));

      // Tech skills
      assert.ok(extracted.tech_skills.includes('Go'));
      assert.ok(extracted.tech_skills.includes('Python'));
      assert.ok(extracted.tech_skills.includes('PostgreSQL'));
      assert.ok(extracted.tech_skills.includes('Kubernetes'));
      assert.ok(extracted.tech_skills.includes('AWS'));

      // Hard skills in English
      assert.ok(extracted.hard_skills.includes('RESTful API Design'));
      assert.ok(extracted.hard_skills.includes('Microservices Architecture'));

      // Soft skills in English
      assert.ok(extracted.soft_skills.includes('Problem Solving'));
      assert.ok(extracted.soft_skills.includes('Communication Skills'));
    });
  });

  describe('Bilingual Resume Scoring (computeATSScore)', () => {
    it('scores English resume against English job using English section titles', () => {
      const extractedJob = extractJobRequirementsHeuristic(sampleEnglishJobPosting, 'en');
      const score = computeATSScore(englishResume, extractedJob, 'en');

      assert.ok(score.overallScore >= 70, `Expected score >= 70, got ${score.overallScore}`);
      assert.ok(score.subScores.keywordMatch.score > 0);
      assert.ok(score.subScores.keywordMatch.matchedTech.includes('Go'));
      assert.ok(score.subScores.keywordMatch.matchedTech.includes('Python'));

      // Section completeness must contain English DEFAULT_SECTION_TITLES
      const enTitles = DEFAULT_SECTION_TITLES.en;
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(enTitles.contact));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(enTitles.experience));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(enTitles.education));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(enTitles.skills));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(enTitles.summary));
      assert.strictEqual(score.subScores.sectionCompleteness.score, 100);
    });

    it('scores Turkish resume against Turkish job using Turkish section titles', () => {
      const extractedJob = extractJobRequirementsHeuristic(sampleTurkishJobPosting, 'tr');
      const score = computeATSScore(turkishResume, extractedJob, 'tr');

      assert.ok(score.overallScore >= 70, `Expected score >= 70, got ${score.overallScore}`);
      assert.ok(score.subScores.keywordMatch.matchedTech.includes('React'));
      assert.ok(score.subScores.keywordMatch.matchedTech.includes('PostgreSQL'));

      // Section completeness must contain Turkish DEFAULT_SECTION_TITLES
      const trTitles = DEFAULT_SECTION_TITLES.tr;
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(trTitles.contact));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(trTitles.experience));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(trTitles.education));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(trTitles.skills));
      assert.ok(score.subScores.sectionCompleteness.presentSections.includes(trTitles.summary));
      assert.strictEqual(score.subScores.sectionCompleteness.score, 100);

      // Verify transparency note is in Turkish
      assert.ok(score.transparencyNote.includes('Gerçek ATS'));
    });
  });

  describe('Bullet Rewrite Heuristic Fallback', () => {
    it('returns Turkish template for Turkish bullet rewrite when AI binding is absent', async () => {
      const original = 'Mikroservis sistemleri geliştirdim.';
      const rewritten = await suggestRewrite({ AI: null }, original, 'Docker', 'tr');

      assert.ok(rewritten.includes(original));
      assert.ok(rewritten.includes('Docker'));
      assert.ok(rewritten.includes('süreç verimliliğini artırmak amacıyla'));
    });

    it('returns English template for English bullet rewrite when AI binding is absent', async () => {
      const original = 'Built backend microservices.';
      const rewritten = await suggestRewrite({ AI: null }, original, 'Kubernetes', 'en');

      assert.ok(rewritten.includes(original));
      assert.ok(rewritten.includes('Kubernetes'));
      assert.ok(rewritten.includes('leveraging Kubernetes for enhanced workflow efficiency'));
    });
  });

  describe('POST /api/analyze Integration Endpoint', () => {
    it('analyzes Turkish job posting and resume with target language tr', async () => {
      const req = new Request('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: turkishResume,
          jobText: sampleTurkishJobPosting,
          language: 'tr',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: any = await res.json();
      assert.strictEqual(json.language, 'tr');
      assert.ok(json.scoreResult.overallScore > 0);
      assert.ok(
        json.scoreResult.subScores.sectionCompleteness.presentSections.includes(
          DEFAULT_SECTION_TITLES.tr.experience
        )
      );
      assert.ok(json.extractedRequirements.tech_skills.includes('React'));
    });

    it('analyzes English job posting and resume with target language en', async () => {
      const req = new Request('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: englishResume,
          jobText: sampleEnglishJobPosting,
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: any = await res.json();
      assert.strictEqual(json.language, 'en');
      assert.ok(json.scoreResult.overallScore > 0);
      assert.ok(
        json.scoreResult.subScores.sectionCompleteness.presentSections.includes(
          DEFAULT_SECTION_TITLES.en.experience
        )
      );
    });

    it('auto-detects Turkish when language parameter is omitted', async () => {
      const req = new Request('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: turkishResume,
          jobText: sampleTurkishJobPosting,
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: any = await res.json();
      assert.strictEqual(json.language, 'tr');
    });
  });

  describe('POST /api/rewrite-bullet Integration Endpoint', () => {
    it('rewrites bullet in Turkish when language is tr', async () => {
      const req = new Request('http://localhost:3000/api/rewrite-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalBullet: 'PostgreSQL sorgularını optimize ettim.',
          missingSkill: 'Redis',
          language: 'tr',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: any = await res.json();
      assert.strictEqual(json.language, 'tr');
      assert.ok(json.suggestion.includes('Redis'));
    });
  });
});
