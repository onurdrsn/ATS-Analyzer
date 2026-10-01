import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BatchJobItemSchema,
  BatchAnalysisRequestSchema,
  BatchAnalysisResponseSchema,
  BatchAnalysisResultItemSchema,
  type BatchJobItem,
  type BatchAnalysisRequest,
  type BatchAnalysisResponse,
} from '../src/schemas/batch.schema.js';
import type { ResumeStructure } from '../src/schemas/resume.schema.js';

// Base mock resume for testing batch requests
const mockResume: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'Jane Challenger',
    email: 'challenger@example.com',
    phone: '+1 555-0199',
    links: ['https://linkedin.com/in/challenger'],
  },
  summary: 'Senior Quality & Systems Engineer testing boundaries and resilience.',
  experience: [
    {
      company: 'Stress Testing Corp',
      title: 'Principal Test Architect',
      startDate: '2020-01',
      endDate: '2024-05',
      description: 'Built adversarial test suites for distributed microservices.',
      bullets: [
        'Created fuzzing harnesses that identified 42 edge-case failures.',
        'Validated schema boundary conditions across polyrepo contracts.',
      ],
    },
  ],
  education: [
    {
      institution: 'State University',
      degree: 'B.S. in Computer Engineering',
      startDate: '2015-09',
      endDate: '2019-06',
    },
  ],
  skills: ['TypeScript', 'Zod', 'Adversarial Testing', 'OTel', 'Docker'],
  projects: [
    {
      name: 'Schema Fuzzer',
      description: 'Adversarial generator for Zod schemas',
      link: 'https://github.com/example/schema-fuzzer',
    },
  ],
};

const mockSubScores = {
  keywordMatch: {
    score: 85,
    techMatchRate: 80,
    hardSkillMatchRate: 85,
    softSkillMatchRate: 90,
    matchedTech: ['TypeScript', 'Docker'],
    missingTech: ['Kubernetes'],
    matchedHard: ['Testing'],
    missingHard: [],
    matchedSoft: ['Communication'],
    missingSoft: [],
  },
  formatParseability: { score: 95, issues: [], passedChecks: ['Standard font'] },
  experienceFit: { score: 88, yearsRequired: 4, yearsEstimated: 5, feedback: 'Strong fit' },
  sectionCompleteness: { score: 100, missingSections: [], presentSections: ['experience', 'education'] },
};

describe('Adversarial Challenger 1: Batch Size Boundary Tests (0, 1, 5, 6, Negative, Extreme)', () => {
  it('TC-CHAL1-SIZE-01: 0 jobs (empty array []) strictly rejected', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [],
    };
    assert.throws(
      () => BatchAnalysisRequestSchema.parse(payload),
      /At least 1 job posting is required/
    );
  });

  it('TC-CHAL1-SIZE-02: 1 job (minimum boundary) with url only accepted', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [{ jobUrl: 'https://careers.example.com/job/101' }],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 1);
    assert.equal(parsed.jobs[0].jobUrl, 'https://careers.example.com/job/101');
    assert.equal(parsed.language, 'en'); // default verification
  });

  it('TC-CHAL1-SIZE-03: 1 job (minimum boundary) with text only accepted', () => {
    const payload = {
      resumeData: mockResume,
      jobs: [{ jobText: 'Senior TypeScript Engineer needed for distributed microservice platform.' }],
    };
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs.length, 1);
    assert.ok(parsed.jobs[0].jobText?.includes('Senior TypeScript Engineer'));
  });

  it('TC-CHAL1-SIZE-04: Exactly 5 jobs (maximum boundary) accepted', () => {
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

  it('TC-CHAL1-SIZE-05: Exactly 6 jobs (upper boundary breach) strictly rejected with 5-job cap message', () => {
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

  it('TC-CHAL1-SIZE-06: 7 jobs strictly rejected', () => {
    const payload = {
      resumeData: mockResume,
      jobs: Array.from({ length: 7 }, (_, i) => ({ jobUrl: `https://example.com/job${i + 1}` })),
    };
    assert.throws(
      () => BatchAnalysisRequestSchema.parse(payload),
      /Batch requests are capped at a maximum of 5 job postings/
    );
  });

  it('TC-CHAL1-SIZE-07: 100 jobs (extreme batch flood) strictly rejected', () => {
    const payload = {
      resumeData: mockResume,
      jobs: Array.from({ length: 100 }, (_, i) => ({ jobUrl: `https://example.com/job${i + 1}` })),
    };
    assert.throws(
      () => BatchAnalysisRequestSchema.parse(payload),
      /Batch requests are capped at a maximum of 5 job postings/
    );
  });

  it('TC-CHAL1-SIZE-08: Intermediate batch sizes (2, 3, 4 jobs) accepted', () => {
    for (const count of [2, 3, 4]) {
      const payload = {
        resumeData: mockResume,
        jobs: Array.from({ length: count }, (_, i) => ({
          jobUrl: `https://example.com/job${i + 1}`,
        })),
      };
      const parsed = BatchAnalysisRequestSchema.parse(payload);
      assert.equal(parsed.jobs.length, count);
    }
  });
});

describe('Adversarial Challenger 1: Type Confusion, Nulls, Undefined, Negative Numbers', () => {
  it('TC-CHAL1-TYPE-01: rejects jobs: null', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: null,
      })
    );
  });

  it('TC-CHAL1-TYPE-02: rejects jobs: undefined (missing jobs field)', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
      })
    );
  });

  it('TC-CHAL1-TYPE-03: rejects jobs: -1 (negative number)', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: -1,
      })
    );
  });

  it('TC-CHAL1-TYPE-04: rejects jobs: 0 (zero number)', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: 0,
      })
    );
  });

  it('TC-CHAL1-TYPE-05: rejects jobs: "1" (string instead of array)', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: '1',
      })
    );
  });

  it('TC-CHAL1-TYPE-06: rejects jobs: {} (object instead of array)', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: {},
      })
    );
  });

  it('TC-CHAL1-TYPE-07: rejects jobs containing null ([null])', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: [null],
      })
    );
  });

  it('TC-CHAL1-TYPE-08: rejects jobs containing undefined ([undefined])', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: [undefined],
      })
    );
  });

  it('TC-CHAL1-TYPE-09: rejects jobs containing primitive numbers ([123, -5])', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: [123],
      })
    );
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: [-5],
      })
    );
  });

  it('TC-CHAL1-TYPE-10: rejects string inside jobs array instead of BatchJobItem object', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: ['https://example.com/job1'],
      })
    );
  });

  it('TC-CHAL1-TYPE-11: rejects missing or null resumeData', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: null,
        jobs: [{ jobUrl: 'https://example.com/job1' }],
      })
    );
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        jobs: [{ jobUrl: 'https://example.com/job1' }],
      })
    );
  });

  it('TC-CHAL1-TYPE-12: rejects negative language code or null language', () => {
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        language: -1,
        jobs: [{ jobUrl: 'https://example.com/job1' }],
      })
    );
    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        language: null,
        jobs: [{ jobUrl: 'https://example.com/job1' }],
      })
    );
  });
});

describe('Adversarial Challenger 1: BatchJobItemSchema - URL vs Text Matrix', () => {
  it('TC-CHAL1-ITEM-01: missing both url AND text ({}) strictly rejected', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({}),
      /Either jobUrl or jobText must be provided/
    );
    assert.throws(
      () => BatchJobItemSchema.parse({ jobTitle: 'Software Engineer', company: 'Acme' }),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-CHAL1-ITEM-02: both url and text empty strings ("") strictly rejected', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({ jobUrl: '', jobText: '' }),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-CHAL1-ITEM-03: both url and text whitespace-only strictly rejected', () => {
    const whitespaceVariants = [
      { jobUrl: '   ', jobText: '   ' },
      { jobUrl: '\t', jobText: '\n\r ' },
      { jobUrl: '     ', jobText: '' },
    ];
    for (const item of whitespaceVariants) {
      assert.throws(
        () => BatchJobItemSchema.parse(item),
        /Either jobUrl or jobText must be provided/
      );
    }
  });

  it('TC-CHAL1-ITEM-04: only valid HTTPS url accepted', () => {
    const item = { jobUrl: 'https://jobs.example.com/view/9981' };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, 'https://jobs.example.com/view/9981');
    assert.equal(parsed.jobText, undefined);
  });

  it('TC-CHAL1-ITEM-05: only valid HTTP url accepted', () => {
    const item = { jobUrl: 'http://careers.internal.net/job/12' };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, 'http://careers.internal.net/job/12');
  });

  it('TC-CHAL1-ITEM-06: only url with complex query, ports, and hash fragment accepted', () => {
    const item = {
      jobUrl: 'https://sub.domain.corp:8443/posting/lead?ref=linkedin&src=web_v2#requirements',
    };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(
      parsed.jobUrl,
      'https://sub.domain.corp:8443/posting/lead?ref=linkedin&src=web_v2#requirements'
    );
  });

  it('TC-CHAL1-ITEM-07: only text provided (short text) accepted', () => {
    const item = { jobText: 'Backend Developer needed.' };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobText, 'Backend Developer needed.');
    assert.equal(parsed.jobUrl, undefined);
  });

  it('TC-CHAL1-ITEM-08: only text provided (long comprehensive job spec) accepted', () => {
    const longText = 'We are seeking a Staff Engineer.\n'.repeat(200);
    const item = { jobText: longText, jobTitle: 'Staff Engineer' };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobText?.length, longText.length);
    assert.equal(parsed.jobTitle, 'Staff Engineer');
  });

  it('TC-CHAL1-ITEM-09: both url and text provided accepted', () => {
    const item = {
      jobUrl: 'https://example.com/job/42',
      jobText: 'Full job description text already fetched or cached.',
      company: 'Tech Leaders Inc.',
      jobTitle: 'Cloud Architect',
    };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, item.jobUrl);
    assert.equal(parsed.jobText, item.jobText);
    assert.equal(parsed.company, item.company);
  });

  it('TC-CHAL1-ITEM-10: whitespace-only text WITH valid url accepted (url satisfies requirement)', () => {
    const item = {
      jobUrl: 'https://example.com/job/42',
      jobText: '    \t   ',
    };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, 'https://example.com/job/42');
  });

  it('TC-CHAL1-ITEM-11: empty string url WITH valid text accepted (preprocessed empty url to undefined)', () => {
    const item = {
      jobUrl: '',
      jobText: 'Experienced Node.js and TypeScript developer.',
    };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, undefined);
    assert.equal(parsed.jobText, 'Experienced Node.js and TypeScript developer.');
  });

  it('TC-CHAL1-ITEM-12: whitespace-only url WITH valid text accepted (preprocessed whitespace url to undefined)', () => {
    const item = {
      jobUrl: '     ',
      jobText: 'Valid job posting text.',
    };
    const parsed = BatchJobItemSchema.parse(item);
    assert.equal(parsed.jobUrl, undefined);
    assert.equal(parsed.jobText, 'Valid job posting text.');
  });

  it('TC-CHAL1-ITEM-13: whitespace-only text AND no url strictly rejected', () => {
    assert.throws(
      () => BatchJobItemSchema.parse({ jobText: '      ' }),
      /Either jobUrl or jobText must be provided/
    );
    assert.throws(
      () => BatchJobItemSchema.parse({ jobText: '\n\r\t  ' }),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-CHAL1-ITEM-14: malformed url with no text strictly rejected with Invalid URL message', () => {
    const invalidUrls = [
      'not-a-valid-url',
      'httpt//missing-colon',
      'www.example.com', // missing protocol scheme
      '://missing-scheme',
      '::invalid::',
      '/local/path/only',
      'http://',
      'https://',
    ];
    for (const badUrl of invalidUrls) {
      assert.throws(
        () => BatchJobItemSchema.parse({ jobUrl: badUrl }),
        /Invalid URL/,
        `Expected rejection for invalid URL: ${badUrl}`
      );
    }
  });

  it('TC-CHAL1-ITEM-15: malformed url WITH valid text strictly rejected (bad url fails validation)', () => {
    // If a user supplies a malformed URL, it must not silently pass just because text is present
    assert.throws(
      () =>
        BatchJobItemSchema.parse({
          jobUrl: 'invalid-url-format',
          jobText: 'Valid description text',
        }),
      /Invalid URL/
    );
  });

  it('TC-CHAL1-ITEM-16: non-string null/number types for jobUrl and jobText rejected', () => {
    assert.throws(() => BatchJobItemSchema.parse({ jobUrl: 12345 }));
    assert.throws(() => BatchJobItemSchema.parse({ jobText: 12345 }));
    assert.throws(() => BatchJobItemSchema.parse({ jobUrl: null }));
    assert.throws(() => BatchJobItemSchema.parse({ jobText: null }));
    assert.throws(() => BatchJobItemSchema.parse({ jobUrl: ['https://example.com'] }));
  });
});

describe('Adversarial Challenger 1: Heterogeneous Batches & Poisoned Element Tests', () => {
  it('TC-CHAL1-HET-01: accepts 5-job batch with mixed heterogeneous inputs', () => {
    const mixedBatch: BatchJobItem[] = [
      { jobUrl: 'https://example.com/job1', jobTitle: 'DevOps' },
      { jobText: 'React and Tailwind frontend developer', company: 'WebCorp' },
      { jobUrl: 'https://example.com/job3', jobText: 'Fullstack engineer' },
      { jobUrl: 'https://example.com/job4', id: 'job-uuid-4' },
      { jobText: 'Python AI/ML researcher', id: 'job-uuid-5', jobTitle: 'AI Lead' },
    ];

    const parsed = BatchAnalysisRequestSchema.parse({
      resumeData: mockResume,
      jobs: mixedBatch,
    });

    assert.equal(parsed.jobs.length, 5);
    assert.equal(parsed.jobs[0].jobTitle, 'DevOps');
    assert.equal(parsed.jobs[1].company, 'WebCorp');
    assert.equal(parsed.jobs[4].id, 'job-uuid-5');
  });

  it('TC-CHAL1-HET-02: 5-job batch where job 3 has malformed URL rejects entire batch', () => {
    const poisonedBatch = [
      { jobUrl: 'https://example.com/job1' },
      { jobUrl: 'https://example.com/job2' },
      { jobUrl: 'malformed_url_no_scheme' }, // POISONED
      { jobUrl: 'https://example.com/job4' },
      { jobUrl: 'https://example.com/job5' },
    ];

    assert.throws(
      () =>
        BatchAnalysisRequestSchema.parse({
          resumeData: mockResume,
          jobs: poisonedBatch,
        }),
      /Invalid URL/
    );
  });

  it('TC-CHAL1-HET-03: 5-job batch where job 5 is empty ({}) rejects entire batch', () => {
    const poisonedBatch = [
      { jobUrl: 'https://example.com/job1' },
      { jobUrl: 'https://example.com/job2' },
      { jobUrl: 'https://example.com/job3' },
      { jobUrl: 'https://example.com/job4' },
      {}, // POISONED
    ];

    assert.throws(
      () =>
        BatchAnalysisRequestSchema.parse({
          resumeData: mockResume,
          jobs: poisonedBatch,
        }),
      /Either jobUrl or jobText must be provided/
    );
  });

  it('TC-CHAL1-HET-04: 3-job batch where job 2 is null rejects entire batch', () => {
    const poisonedBatch = [
      { jobUrl: 'https://example.com/job1' },
      null, // POISONED
      { jobUrl: 'https://example.com/job3' },
    ];

    assert.throws(() =>
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: poisonedBatch,
      })
    );
  });

  it('TC-CHAL1-HET-05: 2-job batch where job 2 has whitespace-only text rejects entire batch', () => {
    const poisonedBatch = [
      { jobUrl: 'https://example.com/job1' },
      { jobText: '     \n\t ' }, // POISONED
    ];

    assert.throws(
      () =>
        BatchAnalysisRequestSchema.parse({
          resumeData: mockResume,
          jobs: poisonedBatch,
        }),
      /Either jobUrl or jobText must be provided/
    );
  });
});

describe('Adversarial Challenger 1: Batch Response & Result Item Numerical Boundaries', () => {
  const baseResultItem = {
    jobIndex: 0,
    jobTitle: 'Senior Test Engineer',
    overallScore: 85,
    subScores: mockSubScores,
    matchedSkills: ['TypeScript', 'Docker'],
    missingSkills: ['Kubernetes'],
    gaps: [],
  };

  it('TC-CHAL1-RESP-01: rejects negative jobIndex (-1)', () => {
    assert.throws(() =>
      BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        jobIndex: -1,
      })
    );
  });

  it('TC-CHAL1-RESP-02: accepts jobIndex 0, 1, 4', () => {
    for (const idx of [0, 1, 4]) {
      const parsed = BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        jobIndex: idx,
      });
      assert.equal(parsed.jobIndex, idx);
    }
  });

  it('TC-CHAL1-RESP-03: rejects non-integer jobIndex (1.5, 2.7)', () => {
    assert.throws(() =>
      BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        jobIndex: 1.5,
      })
    );
  });

  it('TC-CHAL1-RESP-04: rejects negative overallScore (-1, -0.1)', () => {
    assert.throws(() =>
      BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        overallScore: -1,
      })
    );
    assert.throws(() =>
      BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        overallScore: -0.1,
      })
    );
  });

  it('TC-CHAL1-RESP-05: accepts boundary overallScores (0 and 100)', () => {
    const zeroScore = BatchAnalysisResultItemSchema.parse({
      ...baseResultItem,
      overallScore: 0,
    });
    assert.equal(zeroScore.overallScore, 0);

    const maxScore = BatchAnalysisResultItemSchema.parse({
      ...baseResultItem,
      overallScore: 100,
    });
    assert.equal(maxScore.overallScore, 100);
  });

  it('TC-CHAL1-RESP-06: rejects overallScore > 100 (100.1, 105, 999)', () => {
    assert.throws(() =>
      BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        overallScore: 100.1,
      })
    );
    assert.throws(() =>
      BatchAnalysisResultItemSchema.parse({
        ...baseResultItem,
        overallScore: 105,
      })
    );
  });

  it('TC-CHAL1-RESP-07: rejects negative totalJobs in BatchAnalysisResponseSchema', () => {
    assert.throws(() =>
      BatchAnalysisResponseSchema.parse({
        success: true,
        results: [],
        totalJobs: -1,
      })
    );
  });

  it('TC-CHAL1-RESP-08: accepts totalJobs 0 and positive integers', () => {
    const parsed = BatchAnalysisResponseSchema.parse({
      success: true,
      results: [],
      totalJobs: 0,
    });
    assert.equal(parsed.totalJobs, 0);
  });

  it('TC-CHAL1-RESP-09: validates error reporting per job in BatchAnalysisResponseSchema', () => {
    const responseWithErrors = {
      success: true,
      results: [baseResultItem],
      totalJobs: 2,
      processedJobs: 1,
      errors: [
        {
          jobIndex: 1,
          error: 'SSRF protection blocked access to private IP 10.0.0.1',
        },
      ],
    };
    const parsed = BatchAnalysisResponseSchema.parse(responseWithErrors);
    assert.equal(parsed.errors?.length, 1);
    assert.equal(parsed.errors?.[0].jobIndex, 1);
    assert.ok(parsed.errors?.[0].error.includes('SSRF'));
  });
});

describe('Adversarial Challenger 1: Rate Limiting & Quota Scaling Invariants', () => {
  it('TC-CHAL1-RATE-01: Quota formula invariant: batch size must strictly equal number of jobs (1..5)', () => {
    // R3 requirement: "Scale rate limiting based on batch size (each job in a batch counts toward the rate limit quota)."
    for (let count = 1; count <= 5; count++) {
      const payload = {
        resumeData: mockResume,
        jobs: Array.from({ length: count }, (_, i) => ({
          jobUrl: `https://example.com/job${i + 1}`,
        })),
      };
      const parsed = BatchAnalysisRequestSchema.parse(payload);
      const quotaCost = parsed.jobs.length;
      assert.equal(quotaCost, count, `Quota cost for batch of ${count} must equal ${count}`);
    }
  });

  it('TC-CHAL1-RATE-02: Invalid batches (0 or >5) fail validation before rate limit consumption can occur', () => {
    // If a request fails schema validation, the API route handler will immediately return 400 Bad Request
    // without consuming any rate limit quota tokens.
    assert.throws(() => {
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: [],
      });
    });

    assert.throws(() => {
      BatchAnalysisRequestSchema.parse({
        resumeData: mockResume,
        jobs: Array.from({ length: 6 }, (_, i) => ({
          jobUrl: `https://example.com/job${i + 1}`,
        })),
      });
    });
  });
});

describe('Adversarial Challenger 1: Turkish Job Postings & Payload Stress', () => {
  it('TC-CHAL1-TURK-01: Turkish job posting text with all 12 diacritics accepted and preserved verbatim', () => {
    const trText =
      'Özşeker Holding bünyesinde çalışacak; ileri düzey çağdaş Türkçe doğal dil işleme, ' +
      'ağ güvenliği, dağıtık önbellekleme ve mikroservis mimarisine hâkim Kıdemli Yazılım Mühendisi arıyoruz. ' +
      'İŞ TANIMI & ÇALIŞMA ŞARTLARI: DAĞ, GÜNEŞ, ÖRDEK, ŞEMSİYE, ÇİÇEK, İNCİR, IŞIK. ' +
      'Yüksek ücret, özel sağlık sigortası, öğle yemeği ve eğitim desteği. İletişim: ik@ozseker.com';

    const payload = {
      resumeData: mockResume,
      language: 'tr' as const,
      jobs: [
        {
          jobTitle: 'Kıdemli Yazılım Mühendisi',
          company: 'Özşeker Bilişim A.Ş.',
          jobText: trText,
        },
      ],
    };

    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.language, 'tr');
    assert.equal(parsed.jobs[0].jobTitle, 'Kıdemli Yazılım Mühendisi');
    assert.equal(parsed.jobs[0].jobText, trText);

    // Verify Turkish characters
    for (const char of ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'İ', 'Ç', 'Ğ', 'Ö', 'Ş', 'Ü']) {
      assert.ok(
        parsed.jobs[0].jobText?.includes(char),
        `Turkish character ${char} missing from parsed jobText`
      );
    }
  });

  it('TC-CHAL1-TURK-02: Turkish Kariyer.net URL format accepted', () => {
    const kariyerUrl =
      'https://www.kariyer.net/is-ilani/ozseker-bilisim-kidemli-yazilim-muhendisi-3849201';
    const payload = {
      resumeData: mockResume,
      language: 'tr' as const,
      jobs: [{ jobUrl: kariyerUrl }],
    };

    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs[0].jobUrl, kariyerUrl);
  });

  it('TC-CHAL1-STR-01: 5-job batch with 50KB jobText each (250KB total payload) parses in < 150ms', () => {
    const largeJobText =
      'Detailed job requirements, technical responsibilities, stack descriptions and criteria.\n'.repeat(
        600
      ); // ~53KB

    const payload = {
      resumeData: mockResume,
      jobs: Array.from({ length: 5 }, (_, i) => ({
        jobTitle: `Position ${i + 1}`,
        jobText: largeJobText,
      })),
    };

    const startTime = performance.now();
    const parsed = BatchAnalysisRequestSchema.parse(payload);
    const duration = performance.now() - startTime;

    assert.equal(parsed.jobs.length, 5);
    for (let i = 0; i < 5; i++) {
      assert.equal(parsed.jobs[i].jobText?.length, largeJobText.length);
    }
    assert.ok(duration < 150, `Parsing took ${duration}ms, exceeding 150ms budget`);
  });

  it('TC-CHAL1-STR-02: special characters and security payloads in jobText preserved without corruption', () => {
    const attackPayload =
      '"><script>alert(document.cookie)</script>\n' +
      "DROP TABLE users; SELECT * FROM credentials WHERE '1'='1';\n" +
      '\\section*{Attack} \\input{/etc/passwd}\n' +
      'Null \u0000 byte and Unicode Zero-Width \u200B Space';

    const payload = {
      resumeData: mockResume,
      jobs: [{ jobText: attackPayload }],
    };

    const parsed = BatchAnalysisRequestSchema.parse(payload);
    assert.equal(parsed.jobs[0].jobText, attackPayload);
  });
});
