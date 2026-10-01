import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ResumeStructureSchema,
  BilingualResumeSchema,
  DEFAULT_SECTION_TITLES,
} from '../src/schemas/resume.schema.js';

const validEnResume = {
  language: 'en',
  contact: {
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 555-0199',
    links: ['https://linkedin.com/in/johnsmith', 'https://github.com/johnsmith'],
  },
  summary: 'Experienced Full Stack Developer with expertise in React and Node.js.',
  experience: [
    {
      company: 'Tech Solutions Inc.',
      title: 'Full Stack Developer',
      startDate: '2020-03',
      endDate: '2023-08',
      description: 'Developed modern web applications',
      bullets: [
        'Built reactive SPAs using React 19 and Tailwind CSS',
        'Implemented RESTful APIs using Hono and TypeScript',
      ],
    },
  ],
  education: [
    {
      institution: 'State University',
      degree: 'B.S. Computer Science',
      startDate: '2016-09',
      endDate: '2020-05',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
  projects: [
    {
      name: 'ATS Resume Analyzer',
      description: 'Open source resume optimization tool',
      link: 'https://github.com/example/ats',
    },
  ],
};

const validTrResume = {
  language: 'tr',
  contact: {
    name: 'Ahmet Yılmaz',
    email: 'ahmet.yilmaz@example.com',
    phone: '+90 555 123 4567',
    links: ['https://linkedin.com/in/ahmetyilmaz'],
  },
  summary: 'React ve Node.js teknolojilerinde 5 yıl deneyimli Kıdemli Yazılım Geliştirici.',
  experience: [
    {
      company: 'Teknoloji A.Ş.',
      title: 'Kıdemli Yazılım Geliştirici',
      startDate: '2021-02',
      endDate: '2024-05',
      description: 'Mikroservis mimarisi geliştirme',
      bullets: [
        'Yüksek trafikli e-ticaret platformları geliştirdi',
        'PostgreSQL veritabanı optimizasyonları gerçekleştirdi',
      ],
    },
  ],
  education: [
    {
      institution: 'İstanbul Teknik Üniversitesi',
      degree: 'Bilgisayar Mühendisliği Lisans',
      startDate: '2016-09',
      endDate: '2020-06',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
  projects: [],
};

describe('ResumeStructureSchema', () => {
  it('TC-RESUME-01: accepts complete valid resume data', () => {
    const parsed = ResumeStructureSchema.parse(validEnResume);
    assert.equal(parsed.contact.name, 'John Smith');
    assert.equal(parsed.skills.length, 5);
  });

  it('TC-RESUME-02: rejects invalid email address', () => {
    const invalidResume = {
      ...validEnResume,
      contact: { ...validEnResume.contact, email: 'not-an-email' },
    };
    assert.throws(() => ResumeStructureSchema.parse(invalidResume), /Invalid email address/);
  });

  it('TC-RESUME-03: rejects missing contact name', () => {
    const invalidResume = {
      ...validEnResume,
      contact: { ...validEnResume.contact, name: '' },
    };
    assert.throws(() => ResumeStructureSchema.parse(invalidResume), /Name is required/);
  });

  it('TC-RESUME-04: applies empty defaults for omitted array fields', () => {
    const minimalResume = {
      contact: { name: 'Alice', email: 'alice@example.com' },
    };
    const parsed = ResumeStructureSchema.parse(minimalResume);
    assert.deepEqual(parsed.experience, []);
    assert.deepEqual(parsed.education, []);
    assert.deepEqual(parsed.skills, []);
    assert.deepEqual(parsed.projects, []);
  });

  it('TC-RESUME-05: preserves Turkish characters without encoding loss', () => {
    const parsed = ResumeStructureSchema.parse(validTrResume);
    assert.equal(parsed.contact.name, 'Ahmet Yılmaz');
    assert.equal(parsed.experience[0].company, 'Teknoloji A.Ş.');
    assert.equal(parsed.education[0].institution, 'İstanbul Teknik Üniversitesi');
  });
});

describe('BilingualResumeSchema', () => {
  it('TC-BILING-01: accepts English-only resume container', () => {
    const payload = {
      en: validEnResume,
      activeLanguage: 'en',
    };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.ok(parsed.en);
    assert.equal(parsed.tr, undefined);
    assert.equal(parsed.activeLanguage, 'en');
  });

  it('TC-BILING-02: accepts Turkish-only resume container', () => {
    const payload = {
      tr: validTrResume,
      activeLanguage: 'tr',
    };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.ok(parsed.tr);
    assert.equal(parsed.en, undefined);
    assert.equal(parsed.activeLanguage, 'tr');
  });

  it('TC-BILING-03: accepts dual English and Turkish resume container', () => {
    const payload = {
      en: validEnResume,
      tr: validTrResume,
      activeLanguage: 'en',
    };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.ok(parsed.en);
    assert.ok(parsed.tr);
  });

  it('TC-BILING-04: rejects empty container with neither language provided', () => {
    assert.throws(
      () => BilingualResumeSchema.parse({}),
      /At least one language version \(en or tr\) must be provided/
    );
  });

  it('TC-BILING-05: activeLanguage defaults to "en" when omitted', () => {
    const payload = { en: validEnResume };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.equal(parsed.activeLanguage, 'en');
  });
});

describe('DEFAULT_SECTION_TITLES', () => {
  it('TC-SECTITLES-01: contains standard English section headers', () => {
    assert.equal(DEFAULT_SECTION_TITLES.en.summary, 'Professional Summary');
    assert.equal(DEFAULT_SECTION_TITLES.en.experience, 'Work Experience');
    assert.equal(DEFAULT_SECTION_TITLES.en.education, 'Education');
    assert.equal(DEFAULT_SECTION_TITLES.en.skills, 'Skills');
  });

  it('TC-SECTITLES-02: contains standard Turkish section headers with diacritics', () => {
    assert.equal(DEFAULT_SECTION_TITLES.tr.summary, 'Profesyonel Özet');
    assert.equal(DEFAULT_SECTION_TITLES.tr.experience, 'İş Deneyimi');
    assert.equal(DEFAULT_SECTION_TITLES.tr.education, 'Eğitim');
    assert.equal(DEFAULT_SECTION_TITLES.tr.skills, 'Yetenekler');
    assert.equal(DEFAULT_SECTION_TITLES.tr.projects, 'Projeler');
  });
});
