import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SingleAnalysisRequestSchema,
  SingleAnalysisResponseSchema,
  ScoreResultSchema,
  SubScoresSchema,
  RewriteBulletRequestSchema,
  RewriteBulletResponseSchema,
} from '../src/schemas/analysis.schema.js';

const mockResume = {
  contact: { name: 'Jane Doe', email: 'jane@example.com' },
  summary: 'Summary text',
  experience: [],
  education: [],
  skills: ['TypeScript'],
  projects: [],
};

const longJobText =
  'We are seeking a talented Senior Software Engineer with deep expertise in TypeScript, Node.js, and distributed systems to join our team.';

describe('SingleAnalysisRequestSchema (Either jobUrl or jobText)', () => {
  it('TC-EITHER-01: accepts request with valid jobUrl only', () => {
    const payload = {
      resumeData: mockResume,
      jobUrl: 'https://example.com/careers/job123',
    };
    const parsed = SingleAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobUrl, 'https://example.com/careers/job123');
  });

  it('TC-EITHER-02: accepts request with jobText (>= 50 chars) only', () => {
    const payload = {
      resumeData: mockResume,
      jobText: longJobText,
    };
    const parsed = SingleAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobText, longJobText);
  });

  it('TC-EITHER-03: accepts request with both jobUrl and jobText', () => {
    const payload = {
      resumeData: mockResume,
      jobUrl: 'https://example.com/careers/job123',
      jobText: longJobText,
    };
    const parsed = SingleAnalysisRequestSchema.parse(payload);
    assert.ok(parsed.jobUrl);
    assert.ok(parsed.jobText);
  });

  it('TC-EITHER-04: rejects request when neither jobUrl nor jobText is provided', () => {
    const payload = {
      resumeData: mockResume,
    };
    assert.throws(
      () => SingleAnalysisRequestSchema.parse(payload),
      /Either a valid jobUrl or jobText/
    );
  });

  it('TC-EITHER-05: rejects request when jobText is under 50 characters and no URL provided', () => {
    const payload = {
      resumeData: mockResume,
      jobText: 'Too short',
    };
    assert.throws(
      () => SingleAnalysisRequestSchema.parse(payload),
      /Either a valid jobUrl or jobText/
    );
  });
});

describe('ScoreResultSchema & SubScoresSchema', () => {
  const validSubScores = {
    keywordMatch: {
      score: 85,
      techMatchRate: 90,
      hardSkillMatchRate: 80,
      softSkillMatchRate: 85,
      matchedTech: ['TypeScript', 'Node.js'],
      missingTech: ['Docker'],
      matchedHard: ['API Design'],
      missingHard: [],
      matchedSoft: ['Leadership'],
      missingSoft: [],
    },
    formatParseability: {
      score: 95,
      issues: [],
      passedChecks: ['Single column', 'Standard margins'],
    },
    experienceFit: {
      score: 80,
      yearsRequired: 3,
      yearsEstimated: 5,
      feedback: 'Candidate meets and exceeds experience requirement.',
    },
    sectionCompleteness: {
      score: 100,
      missingSections: [],
      presentSections: ['contact', 'summary', 'experience', 'education', 'skills'],
    },
  };

  it('TC-SCORE-01: validates complete SubScores structure', () => {
    const parsed = SubScoresSchema.parse(validSubScores);
    assert.equal(parsed.keywordMatch.score, 85);
    assert.equal(parsed.formatParseability.score, 95);
  });

  it('TC-SCORE-02: rejects score values above 100', () => {
    const invalidSubScores = {
      ...validSubScores,
      keywordMatch: { ...validSubScores.keywordMatch, score: 105 },
    };
    assert.throws(() => SubScoresSchema.parse(invalidSubScores));
  });

  it('TC-SCORE-03: rejects score values below 0', () => {
    const invalidSubScores = {
      ...validSubScores,
      keywordMatch: { ...validSubScores.keywordMatch, score: -5 },
    };
    assert.throws(() => SubScoresSchema.parse(invalidSubScores));
  });

  it('TC-SCORE-04: validates full ScoreResult structure', () => {
    const fullResult = {
      overallScore: 88,
      subScores: validSubScores,
      transparencyNote: 'Scored using deterministic ATS heuristics.',
    };
    const parsed = ScoreResultSchema.parse(fullResult);
    assert.equal(parsed.overallScore, 88);
  });
});

describe('RewriteBulletRequestSchema & ResponseSchema', () => {
  it('TC-REWRITE-01: validates bullet rewrite request', () => {
    const payload = {
      originalBullet: 'Built internal tools with JavaScript',
      missingSkill: 'TypeScript',
    };
    const parsed = RewriteBulletRequestSchema.parse(payload);
    assert.equal(parsed.originalBullet, payload.originalBullet);
    assert.equal(parsed.missingSkill, payload.missingSkill);
  });

  it('TC-REWRITE-02: rejects empty bullet rewrite request', () => {
    assert.throws(
      () => RewriteBulletRequestSchema.parse({ originalBullet: '', missingSkill: 'React' }),
      /Original bullet is required/
    );
  });

  it('TC-REWRITE-03: validates bullet rewrite response', () => {
    const payload = {
      original: 'Built internal tools with JavaScript',
      skill: 'TypeScript',
      suggestion: 'Engineered robust internal developer tools using TypeScript',
    };
    const parsed = RewriteBulletResponseSchema.parse(payload);
    assert.equal(parsed.skill, 'TypeScript');
  });
});
