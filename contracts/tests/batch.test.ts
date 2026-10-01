import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BatchJobItemSchema,
  BatchAnalysisRequestSchema,
  BatchAnalysisResponseSchema,
  BatchAnalysisResultItemSchema,
} from '../src/schemas/batch.schema.js';
import type { ResumeStructure } from '../src/schemas/resume.schema.js';

const mockResume: ResumeStructure = {
  contact: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    links: [],
  },
  summary: 'Experienced Software Engineer with 5+ years of experience.',
  experience: [
    {
      company: 'Tech Corp',
      title: 'Senior Developer',
      startDate: '2021-01',
      description: 'Full stack development',
      bullets: ['Built scalable microservices in Node.js', 'Managed PostgreSQL databases'],
    },
  ],
  education: [
    {
      institution: 'University of Engineering',
      degree: 'B.S. in Computer Science',
      startDate: '2016-09',
      endDate: '2020-06',
    },
  ],
  skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
  projects: [],
};

describe('BatchJobItemSchema', () => {
  it('TC-JOBITEM-01: accepts valid jobUrl only', () => {
    const item = { jobUrl: 'https://careers.example.com/job/456' };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, 'https://careers.example.com/job/456');
  });

  it('TC-JOBITEM-02: accepts valid jobText only', () => {
    const item = { jobText: 'Looking for a Senior Backend Engineer proficient in TypeScript.' };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobText, item.jobText);
  });

  it('TC-JOBITEM-03: accepts both valid jobUrl and jobText', () => {
    const item = {
      jobUrl: 'https://careers.example.com/job/456',
      jobText: 'Full job posting description text...',
      jobTitle: 'Senior Backend Engineer',
      company: 'Acme Corp',
    };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobTitle, 'Senior Backend Engineer');
    assert.equal(parsed.company, 'Acme Corp');
  });

  it('TC-JOBITEM-04: rejects when neither jobUrl nor jobText is provided ({})', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({}),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-JOBITEM-05: rejects when both jobUrl and jobText are empty strings', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({ jobUrl: '', jobText: '' }),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-JOBITEM-06: rejects when both jobUrl and jobText are whitespace only', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({ jobUrl: '   ', jobText: '   ' }),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-JOBITEM-07: rejects invalid URL format when jobUrl is provided', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({ jobUrl: 'not-a-valid-url' }),
      /Invalid URL/
    );
  });
});

describe('BatchAnalysisRequestSchema (0, 1-5, 6 Jobs Validation)', () => {
  it('TC-BATCH-01: rejects empty jobs array (0 jobs)', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [],
    };
    assert.throws(
      () => BatchAnalysisRequestSchema.parse(payload),
      /At least 1 job posting is required/
    );
  });

  it('TC-BATCH-02: accepts exactly 1 job (minimum boundary)', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [{ jobUrl: 'https://example.com/job1' }],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 1);
    assert.equal(parsed.language, 'en'); // default verification
  });

  it('TC-BATCH-03: accepts 2 jobs', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [
        { jobUrl: 'https://example.com/job1' },
        { jobText: 'Software Engineer with React experience' },
      ],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 2);
  });

  it('TC-BATCH-04: accepts 3 jobs', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [
        { jobUrl: 'https://example.com/job1' },
        { jobUrl: 'https://example.com/job2' },
        { jobUrl: 'https://example.com/job3' },
      ],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 3);
  });

  it('TC-BATCH-05: accepts 4 jobs', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [
        { jobUrl: 'https://example.com/job1' },
        { jobUrl: 'https://example.com/job2' },
        { jobUrl: 'https://example.com/job3' },
        { jobUrl: 'https://example.com/job4' },
      ],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 4);
  });

  it('TC-BATCH-06: accepts exactly 5 jobs (maximum boundary)', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [
        { jobUrl: 'https://example.com/job1' },
        { jobUrl: 'https://example.com/job2' },
        { jobUrl: 'https://example.com/job3' },
        { jobUrl: 'https://example.com/job4' },
        { jobUrl: 'https://example.com/job5' },
      ],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 5);
  });

  it('TC-BATCH-07: rejects 6 jobs (exceeds 5-job cap)', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [
        { jobUrl: 'https://example.com/job1' },
        { jobUrl: 'https://example.com/job2' },
        { jobUrl: 'https://example.com/job3' },
        { jobUrl: 'https://example.com/job4' },
        { jobUrl: 'https://example.com/job5' },
        { jobUrl: 'https://example.com/job6' },
      ],
    };
    assert.throws(
      () => BatchAnalysisRequestSchema.parse(payload),
      /Batch requests are capped at a maximum of 5 job postings/
    );
  });

  it('TC-BATCH-08: rejects 10 jobs', () => {
    const payload = {
      resumeData: mockResume,
      jobs: Array.from({ length: 10 }, (_, i) => ({
        jobUrl: `https://example.com/job${i + 1}`,
      })),
    };
    assert.throws(
      () => BatchAnalysisRequestSchema.parse(payload),
      /Batch requests are capped at a maximum of 5 job postings/
    );
  });

  it('TC-BATCH-09: accepts explicit language "tr"', () => {
    const payload = {
      resumeData: mockResume,
      language: 'tr',
      jobs: [{ jobText: 'Kıdemli Yazılım Mühendisi arıyoruz.' }],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.language, 'tr');
  });
});

describe('BatchAnalysisResponseSchema', () => {
  it('TC-BATCHRESP-01: accepts valid batch response with result items', () => {
    const response = {
      success: true,
      totalJobs: 2,
      results: [
        {
          jobIndex: 0,
          jobTitle: 'Frontend Engineer',
          company: 'Acme',
          overallScore: 85,
          subScores: {
            keywordMatch: {
              score: 90,
              techMatchRate: 85,
              hardSkillMatchRate: 80,
              softSkillMatchRate: 90,
              matchedTech: ['React', 'TypeScript'],
              missingTech: ['GraphQL'],
              matchedHard: ['Frontend'],
              missingHard: [],
              matchedSoft: ['Communication'],
              missingSoft: [],
            },
            formatParseability: { score: 95, issues: [], passedChecks: ['Standard font'] },
            experienceFit: { score: 80, yearsRequired: 3, yearsEstimated: 5, feedback: 'Well qualified' },
            sectionCompleteness: { score: 100, missingSections: [], presentSections: ['experience', 'education'] },
          },
          matchedSkills: ['React', 'TypeScript'],
          missingSkills: ['GraphQL'],
          gaps: [],
        },
        {
          jobIndex: 1,
          jobTitle: 'Backend Engineer',
          overallScore: 72,
          subScores: {
            keywordMatch: {
              score: 70,
              techMatchRate: 65,
              hardSkillMatchRate: 70,
              softSkillMatchRate: 80,
              matchedTech: ['Node.js'],
              missingTech: ['Redis', 'Kafka'],
              matchedHard: ['API Design'],
              missingHard: [],
              matchedSoft: ['Teamwork'],
              missingSoft: [],
            },
            formatParseability: { score: 95, issues: [], passedChecks: ['Standard font'] },
            experienceFit: { score: 75, yearsRequired: 4, yearsEstimated: 5, feedback: 'Meets requirements' },
            sectionCompleteness: { score: 100, missingSections: [], presentSections: ['experience', 'education'] },
          },
          matchedSkills: ['Node.js'],
          missingSkills: ['Redis', 'Kafka'],
          gaps: [],
        },
      ],
    };
    const parsed = BatchAnalysisResponseSchema.parse(response);
    assert.equal(parsed.success, true);
    assert.equal(parsed.results.length, 2);
    assert.equal(parsed.results[0].overallScore, 85);
  });
});
