import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useBatchStore } from '../src/store/batchStore';
import { validateJobEntry, isValidHttpUrl } from '../src/lib/validation';
import { en, tr } from '../src/i18n/translations';
import {
  BatchAnalysisRequestSchema,
  BatchAnalysisResponseSchema,
  BatchJobItemSchema,
  type BatchAnalysisResponse,
} from '@ats-analyzer/contracts';

describe('Batch Store (Zustand) & 5-Job Cap Safeguard', () => {
  beforeEach(() => {
    useBatchStore.getState().reset();
  });

  it('should initialize with exactly 1 job, null results, and idle state', () => {
    const state = useBatchStore.getState();
    assert.equal(state.jobs.length, 1);
    assert.equal(state.results, null);
    assert.equal(state.isAnalyzing, false);
    assert.equal(state.error, null);
    assert.equal(state.jobs[0].activeInputType, 'text');
  });

  it('should allow adding jobs up to the 5-job cap', () => {
    const store = useBatchStore.getState();

    // Starts with 1 job
    assert.equal(store.jobs.length, 1);

    // Add 2nd, 3rd, 4th, 5th jobs
    assert.equal(store.addJob(), true); // 2
    assert.equal(store.addJob(), true); // 3
    assert.equal(store.addJob(), true); // 4
    assert.equal(store.addJob(), true); // 5

    assert.equal(useBatchStore.getState().jobs.length, 5);
  });

  it('should strictly reject/prevent adding a 6th job when 5-job cap is reached', () => {
    const store = useBatchStore.getState();

    // Add up to 5 jobs
    for (let i = 0; i < 4; i++) {
      store.addJob();
    }
    assert.equal(useBatchStore.getState().jobs.length, 5);

    // Attempting to add a 6th job must return false and not alter jobs array
    const result = store.addJob();
    assert.equal(result, false);
    assert.equal(useBatchStore.getState().jobs.length, 5);
  });

  it('should allow removing jobs down to 1 job but strictly prevent reducing below 1', () => {
    const store = useBatchStore.getState();

    // Add 2 more jobs (total 3)
    store.addJob();
    store.addJob();
    assert.equal(useBatchStore.getState().jobs.length, 3);

    const jobs = useBatchStore.getState().jobs;
    const removedId = jobs[1].id;

    // Remove 1 job
    assert.equal(store.removeJob(removedId), true);
    assert.equal(useBatchStore.getState().jobs.length, 2);
    assert.ok(!useBatchStore.getState().jobs.some((j) => j.id === removedId));

    // Remove down to 1 job
    const remainingJob = useBatchStore.getState().jobs[0];
    const secondJob = useBatchStore.getState().jobs[1];
    assert.equal(store.removeJob(secondJob.id), true);
    assert.equal(useBatchStore.getState().jobs.length, 1);

    // Attempting to remove the last remaining job must return false and preserve count at 1
    const removeAttempt = store.removeJob(remainingJob.id);
    assert.equal(removeAttempt, false);
    assert.equal(useBatchStore.getState().jobs.length, 1);
  });

  it('should correctly update job properties (title, company, URL, text, input type)', () => {
    const store = useBatchStore.getState();
    const jobId = store.jobs[0].id;

    store.updateJob(jobId, {
      jobTitle: 'Senior Platform Engineer',
      company: 'Cloud Native Corp',
      jobUrl: 'https://example.com/careers/platform-eng',
      activeInputType: 'url',
    });

    const updatedJob = useBatchStore.getState().jobs[0];
    assert.equal(updatedJob.jobTitle, 'Senior Platform Engineer');
    assert.equal(updatedJob.company, 'Cloud Native Corp');
    assert.equal(updatedJob.jobUrl, 'https://example.com/careers/platform-eng');
    assert.equal(updatedJob.activeInputType, 'url');
  });

  it('should manage analysis state transitions and reset correctly', () => {
    const store = useBatchStore.getState();

    store.setIsAnalyzing(true);
    assert.equal(useBatchStore.getState().isAnalyzing, true);

    store.setError('SSRF block triggered');
    assert.equal(useBatchStore.getState().error, 'SSRF block triggered');

    const mockResponse: BatchAnalysisResponse = {
      success: true,
      totalJobs: 1,
      results: [
        {
          jobIndex: 0,
          jobId: 'job-1',
          jobTitle: 'Software Architect',
          overallScore: 92,
          subScores: {
            keywordMatch: {
              score: 90,
              techMatchRate: 95,
              hardSkillMatchRate: 85,
              softSkillMatchRate: 80,
              matchedTech: ['TypeScript', 'Node.js'],
              missingTech: [],
              matchedHard: ['API Design'],
              missingHard: [],
              matchedSoft: ['Leadership'],
              missingSoft: [],
            },
            formatParseability: {
              score: 95,
              issues: [],
              passedChecks: ['Vector PDF', 'Standard Headings'],
            },
            experienceFit: {
              score: 90,
              yearsRequired: 5,
              yearsEstimated: 6,
              feedback: 'Strong alignment with seniority requirements',
            },
            sectionCompleteness: {
              score: 100,
              missingSections: [],
              presentSections: ['Experience', 'Education', 'Skills'],
            },
          },
          matchedSkills: ['TypeScript', 'Node.js'],
          missingSkills: [],
          gaps: [],
        },
      ],
    };

    store.setResults(mockResponse);
    assert.equal(useBatchStore.getState().results?.totalJobs, 1);
    assert.equal(useBatchStore.getState().results?.results[0].overallScore, 92);

    // Reset back to initial
    store.reset();
    assert.equal(useBatchStore.getState().jobs.length, 1);
    assert.equal(useBatchStore.getState().results, null);
    assert.equal(useBatchStore.getState().error, null);
    assert.equal(useBatchStore.getState().isAnalyzing, false);
  });
});

describe('Batch Submission Payload Formatting & Contract Validation', () => {
  beforeEach(() => {
    useBatchStore.getState().reset();
  });

  it('should format payload correctly and satisfy BatchJobItemSchema', () => {
    const store = useBatchStore.getState();

    // Configure Job 1 with URL
    store.updateJob(store.jobs[0].id, {
      jobTitle: 'DevOps Specialist',
      company: 'InfraCorp',
      jobUrl: 'https://infracorp.io/jobs/devops',
      activeInputType: 'url',
    });

    // Add Job 2 with Raw Text (>= 50 chars)
    store.addJob();
    const jobs = useBatchStore.getState().jobs;
    store.updateJob(jobs[1].id, {
      jobTitle: 'Frontend Engineer',
      company: 'Web Solutions',
      jobText: 'We are seeking a React and TypeScript frontend developer with at least 3 years experience.',
      activeInputType: 'text',
    });

    const payload = store.getSubmissionPayload();
    assert.equal(payload.length, 2);

    // Job 1 validation
    assert.equal(payload[0].jobTitle, 'DevOps Specialist');
    assert.equal(payload[0].company, 'InfraCorp');
    assert.equal(payload[0].jobUrl, 'https://infracorp.io/jobs/devops');
    assert.doesNotThrow(() => BatchJobItemSchema.parse(payload[0]));

    // Job 2 validation
    assert.equal(payload[1].jobTitle, 'Frontend Engineer');
    assert.equal(payload[1].company, 'Web Solutions');
    assert.ok(payload[1].jobText && payload[1].jobText.length >= 50);
    assert.doesNotThrow(() => BatchJobItemSchema.parse(payload[1]));

    // Validate complete BatchAnalysisRequestSchema
    const fullRequest = {
      resumeData: {
        contact: { name: 'John Doe', email: 'john@example.com' },
        skills: ['React', 'TypeScript', 'Docker'],
      },
      language: 'en' as const,
      jobs: payload,
    };
    assert.doesNotThrow(() => BatchAnalysisRequestSchema.parse(fullRequest));
  });

  it('should validate simulated batch response against BatchAnalysisResponseSchema', () => {
    const sampleResponse: BatchAnalysisResponse = {
      success: true,
      totalJobs: 2,
      processedJobs: 2,
      results: [
        {
          jobIndex: 0,
          jobId: 'job-1',
          jobTitle: 'Fullstack Dev',
          overallScore: 88,
          subScores: {
            keywordMatch: {
              score: 85,
              techMatchRate: 90,
              hardSkillMatchRate: 80,
              softSkillMatchRate: 75,
              matchedTech: ['React', 'Node'],
              missingTech: ['PostgreSQL'],
              matchedHard: [],
              missingHard: [],
              matchedSoft: [],
              missingSoft: [],
            },
            formatParseability: {
              score: 95,
              issues: [],
              passedChecks: ['Valid Text'],
            },
            experienceFit: {
              score: 90,
              yearsRequired: 3,
              yearsEstimated: 4,
              feedback: 'Good fit',
            },
            sectionCompleteness: {
              score: 100,
              missingSections: [],
              presentSections: ['Experience', 'Education', 'Skills'],
            },
          },
          matchedSkills: ['React', 'Node'],
          missingSkills: ['PostgreSQL'],
          gaps: [],
        },
        {
          jobIndex: 1,
          jobId: 'job-2',
          jobTitle: 'Backend Dev',
          overallScore: 78,
          subScores: {
            keywordMatch: {
              score: 75,
              techMatchRate: 70,
              hardSkillMatchRate: 80,
              softSkillMatchRate: 70,
              matchedTech: ['Node'],
              missingTech: ['Kubernetes', 'Go'],
              matchedHard: [],
              missingHard: [],
              matchedSoft: [],
              missingSoft: [],
            },
            formatParseability: {
              score: 95,
              issues: [],
              passedChecks: ['Valid Text'],
            },
            experienceFit: {
              score: 80,
              yearsRequired: 5,
              yearsEstimated: 4,
              feedback: 'Slightly junior for this role',
            },
            sectionCompleteness: {
              score: 100,
              missingSections: [],
              presentSections: ['Experience', 'Education', 'Skills'],
            },
          },
          matchedSkills: ['Node'],
          missingSkills: ['Kubernetes', 'Go'],
          gaps: [],
        },
      ],
    };

    assert.doesNotThrow(() => BatchAnalysisResponseSchema.parse(sampleResponse));
  });
});

describe('Batch Input Validation Logic', () => {
  it('should validate URLs properly using isValidHttpUrl', () => {
    assert.equal(isValidHttpUrl('https://example.com/job/1'), true);
    assert.equal(isValidHttpUrl('http://kariyer.net/ilan/123'), true);
    assert.equal(isValidHttpUrl('not-a-url'), false);
    assert.equal(isValidHttpUrl('ftp://example.com/file'), false);
    assert.equal(isValidHttpUrl(''), false);
    assert.equal(isValidHttpUrl('   '), false);
  });

  it('should validate batch job entry in URL mode', () => {
    const validUrlJob = {
      id: 'job-1',
      jobUrl: 'https://company.org/careers/123',
      jobText: '',
      activeInputType: 'url' as const,
    };
    assert.deepEqual(validateJobEntry(validUrlJob), { isValid: true });

    const invalidUrlJob = {
      id: 'job-2',
      jobUrl: 'htp:/broken',
      jobText: '',
      activeInputType: 'url' as const,
    };
    assert.equal(validateJobEntry(invalidUrlJob).isValid, false);
    assert.equal(validateJobEntry(invalidUrlJob).error, 'invalidUrl');
  });

  it('should validate batch job entry in Text mode', () => {
    const validTextJob = {
      id: 'job-1',
      jobUrl: '',
      jobText: 'We are seeking an experienced software engineer to develop high-throughput microservices using TypeScript, Node.js, and Docker.',
      activeInputType: 'text' as const,
    };
    assert.deepEqual(validateJobEntry(validTextJob), { isValid: true });

    const shortTextJob = {
      id: 'job-2',
      jobUrl: '',
      jobText: 'Short job description.',
      activeInputType: 'text' as const,
    };
    assert.equal(validateJobEntry(shortTextJob).isValid, false);
    assert.equal(validateJobEntry(shortTextJob).error, 'textTooShort');
  });
});

describe('Batch i18n Dictionary Parity & Helper Execution', () => {
  it('should contain all required batch keys in both English and Turkish', () => {
    const requiredBatchKeys = [
      'title',
      'subtitle',
      'jobCounter',
      'addJob',
      'removeJob',
      'maxJobsReached',
      'minJobsRequired',
      'compareButton',
      'comparing',
      'overallScore',
      'bestMatch',
      'keywordMatch',
      'formatParseability',
      'experienceFit',
      'sectionCompleteness',
      'matchedSkills',
      'missingSkills',
      'jobCardTitle',
      'jobTitleLabel',
      'jobTitlePlaceholder',
      'companyLabel',
      'companyPlaceholder',
      'urlTab',
      'textTab',
      'urlLabel',
      'urlPlaceholder',
      'textLabel',
      'textPlaceholder',
      'invalidUrl',
      'textTooShort',
      'validInputRequired',
      'loadSampleJobEn',
      'loadSampleJobTr',
      'comparisonMatrixTitle',
      'noResultsYet',
      'jobError',
      'checksPassed',
      'yearsComparison',
      'completenessDetail',
    ];

    for (const key of requiredBatchKeys) {
      assert.ok(key in en.batch, `Missing key in en.batch: ${key}`);
      assert.ok(key in tr.batch, `Missing key in tr.batch: ${key}`);
      assert.equal(
        typeof (en.batch as any)[key],
        typeof (tr.batch as any)[key],
        `Type mismatch for batch key: ${key}`
      );
    }
  });

  it('should execute formatting helpers with expected outputs in EN and TR', () => {
    // jobCounter
    assert.equal(en.batch.jobCounter(3, 5), '(3/5 Jobs)');
    assert.equal(tr.batch.jobCounter(3, 5), '(3/5 İlan)');

    // jobCardTitle
    assert.equal(en.batch.jobCardTitle(2), 'Job #2');
    assert.equal(tr.batch.jobCardTitle(2), 'İlan #2');

    // checksPassed
    assert.equal(en.batch.checksPassed(4), '4 checks passed');
    assert.equal(tr.batch.checksPassed(4), '4 denetim başarıyla geçti');

    // yearsComparison
    assert.equal(en.batch.yearsComparison(4, 3), '~4 yrs vs 3 req.');
    assert.equal(tr.batch.yearsComparison(4, 3), '~4 yıl deneyim (istenen: 3)');
  });

  it('should have navigation switch keys in header for both languages', () => {
    assert.equal(en.header.navSingle, 'Single Analysis');
    assert.equal(en.header.navBatch, 'Batch Compare (1-5)');
    assert.equal(tr.header.navSingle, 'Tekli Analiz');
    assert.equal(tr.header.navBatch, 'Çoklu İlan Karşılaştırma (1-5)');
  });
});
