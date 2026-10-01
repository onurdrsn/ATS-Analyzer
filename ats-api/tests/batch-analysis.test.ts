import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import {
  BatchAnalysisResponseSchema,
  SubScoresSchema,
  type ResumeStructure,
} from '@ats-analyzer/contracts';

const sampleResume: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 555-0199',
    links: ['https://github.com/alexjohnson', 'https://linkedin.com/in/alexjohnson'],
  },
  summary: 'Senior Software Engineer with 6+ years of experience specializing in TypeScript, Node.js, and cloud systems.',
  experience: [
    {
      company: 'TechCorp Solutions',
      title: 'Senior Software Engineer',
      startDate: '2021-03',
      endDate: 'Present',
      description: 'Lead backend engineering for scalable distributed systems.',
      bullets: [
        'Architected and implemented microservices using TypeScript, Node.js, and PostgreSQL, handling 20M+ daily events.',
        'Containerized application workloads using Docker and deployed on Kubernetes clusters with zero-downtime CI/CD.',
        'Mentored junior engineers and conducted peer code reviews adhering to modern best practices.',
      ],
    },
    {
      company: 'DataFlow Systems',
      title: 'Software Engineer',
      startDate: '2018-06',
      endDate: '2021-02',
      bullets: [
        'Developed RESTful APIs with Python and PostgreSQL.',
        'Built automated test pipelines reducing regression rates by 35%.',
      ],
    },
  ],
  education: [
    {
      institution: 'University of Washington',
      degree: 'B.S. in Computer Science',
      startDate: '2014-09',
      endDate: '2018-06',
    },
  ],
  skills: [
    'TypeScript',
    'Node.js',
    'JavaScript',
    'PostgreSQL',
    'Docker',
    'Kubernetes',
    'Python',
    'REST APIs',
    'Git',
    'CI/CD',
  ],
  projects: [
    {
      name: 'OpenATS',
      description: 'Open source resume and job match analyzer built with TypeScript.',
    },
  ],
};

const jobDescription1 = `
Job Title: Senior Backend Developer
Company: CloudScale Inc.
Requirements:
- Strong experience with TypeScript and Node.js backend development for at least 3 years.
- Hands-on expertise with PostgreSQL database optimization and schema design.
- Practical experience with Docker containerization and Kubernetes orchestration.
- Good knowledge of RESTful API development and microservices patterns.
`;

const jobDescription2 = `
Job Title: Lead Python Engineer
Company: DataSphere Analytics
Requirements:
- 5+ years of software engineering experience primarily in Python.
- Deep expertise in data pipelines, PostgreSQL, and distributed caching.
- Familiarity with Kubernetes, CI/CD automation, and cloud deployments.
- Strong team leadership and code review experience.
`;

const jobDescription3 = `
Job Title: Full Stack React & Node Developer
Company: ModernWeb Labs
Requirements:
- Proven experience with React, TypeScript, and modern CSS architecture.
- Backend API proficiency in Node.js, Express, and PostgreSQL.
- Understanding of automated testing, Git workflows, and CI/CD pipelines.
- At least 3 years of professional full stack software development.
`;

const jobDescription4 = `
Job Title: DevOps & Platform Engineer
Company: InfraCore Solutions
Requirements:
- Strong background in Linux systems, Docker containerization, and Kubernetes.
- Experience with infrastructure automation, CI/CD pipelines, and cloud security.
- Proficiency in scripting with Python or Bash.
- At least 4 years in a platform or DevOps engineering role.
`;

const jobDescription5 = `
Job Title: Junior Frontend Developer
Company: CreativeDesign Agency
Requirements:
- Proficiency in HTML5, CSS3, and modern JavaScript / TypeScript.
- Basic familiarity with React components and state management.
- Eager to learn, passionate about clean UI/UX and responsive web design.
- 1+ years experience or portfolio of relevant web projects.
`;

describe('Milestone 3: ats-api Batch Analysis Endpoint (/api/analyze/batch)', () => {
  describe('1. Valid Batch Requests (1-job, 3-job, 5-job)', () => {
    it('successfully processes 1-job batch and validates against BatchAnalysisResponseSchema', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.1.1',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          language: 'en',
          jobs: [{ jobTitle: 'Senior Backend Developer', jobText: jobDescription1 }],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();

      // Schema verification
      const parseResult = BatchAnalysisResponseSchema.safeParse(data);
      assert.ok(parseResult.success, `Schema validation failed: ${JSON.stringify(parseResult.error?.issues)}`);

      // Field assertions
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.totalJobs, 1);
      assert.strictEqual(data.processedJobs, 1);
      assert.strictEqual(data.successCount, 1);
      assert.strictEqual(data.results.length, 1);

      const item = data.results[0];
      assert.strictEqual(item.jobIndex, 0);
      assert.strictEqual(item.jobTitle, 'Senior Backend Developer');
      assert.ok(item.overallScore > 0 && item.overallScore <= 100);
      assert.strictEqual(item.error, undefined);

      // Verify subScores schema
      const subScoreValidation = SubScoresSchema.safeParse(item.subScores);
      assert.ok(subScoreValidation.success);
      assert.ok(item.matchedSkills.length > 0);

      // Verify bestMatch
      assert.ok(data.bestMatch);
      assert.strictEqual(data.bestMatch.jobIndex, 0);
    });

    it('successfully processes 3-job batch with accurate rankings and schema validation', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.1.2',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          language: 'en',
          jobs: [
            { jobTitle: 'Job 1 - Backend TS', jobText: jobDescription1 },
            { jobTitle: 'Job 2 - Lead Python', jobText: jobDescription2 },
            { jobTitle: 'Job 3 - Full Stack React', jobText: jobDescription3 },
          ],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();

      const parseResult = BatchAnalysisResponseSchema.safeParse(data);
      assert.ok(parseResult.success, `Schema validation failed: ${JSON.stringify(parseResult.error?.issues)}`);

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.totalJobs, 3);
      assert.strictEqual(data.processedJobs, 3);
      assert.strictEqual(data.successCount, 3);
      assert.strictEqual(data.results.length, 3);

      for (let i = 0; i < 3; i++) {
        assert.strictEqual(data.results[i].jobIndex, i);
        assert.ok(data.results[i].overallScore >= 0);
        assert.strictEqual(data.results[i].error, undefined);
        const subParsed = SubScoresSchema.safeParse(data.results[i].subScores);
        assert.ok(subParsed.success);
      }

      // bestMatch should have the maximum score
      assert.ok(data.bestMatch);
      const maxScore = Math.max(...data.results.map((r: any) => r.overallScore));
      assert.strictEqual(data.bestMatch.overallScore, maxScore);
    });

    it('successfully processes 5-job batch (maximum allowed cap) without error', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.1.3',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          language: 'en',
          jobs: [
            { jobTitle: 'Job 1', jobText: jobDescription1 },
            { jobTitle: 'Job 2', jobText: jobDescription2 },
            { jobTitle: 'Job 3', jobText: jobDescription3 },
            { jobTitle: 'Job 4', jobText: jobDescription4 },
            { jobTitle: 'Job 5', jobText: jobDescription5 },
          ],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();

      const parseResult = BatchAnalysisResponseSchema.safeParse(data);
      assert.ok(parseResult.success, `Schema validation failed: ${JSON.stringify(parseResult.error?.issues)}`);

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.totalJobs, 5);
      assert.strictEqual(data.processedJobs, 5);
      assert.strictEqual(data.successCount, 5);
      assert.strictEqual(data.results.length, 5);
    });
  });

  describe('2. Validation & Cap Enforcement (0 jobs, >5 jobs, malformed)', () => {
    it('rejects batch request with 0 jobs with HTTP 400 Bad Request', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.2.1',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          jobs: [],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data: any = await res.json();
      assert.ok(data.error || data.details);
      const errorMsg = JSON.stringify(data);
      assert.ok(
        errorMsg.includes('1 job posting is required') || errorMsg.includes('At least one job'),
        `Expected rejection message for 0 jobs, got: ${errorMsg}`
      );
    });

    it('rejects batch request with 6 jobs (>5 cap) with HTTP 400 Bad Request', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.2.2',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          jobs: [
            { jobText: jobDescription1 },
            { jobText: jobDescription2 },
            { jobText: jobDescription3 },
            { jobText: jobDescription4 },
            { jobText: jobDescription5 },
            { jobText: 'Job 6: Senior Systems Architect with comprehensive cloud experience.' },
          ],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data: any = await res.json();
      assert.ok(data.error || data.details);
      const errorMsg = JSON.stringify(data);
      assert.ok(
        errorMsg.includes('5') || errorMsg.includes('capped'),
        `Expected rejection mentioning 5-job cap, got: ${errorMsg}`
      );
    });

    it('rejects request with invalid job item missing both jobUrl and jobText', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.2.3',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          jobs: [{ jobTitle: 'Missing Content Job' }],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data: any = await res.json();
      assert.ok(data.error || data.details);
    });

    it('rejects non-JSON payload with HTTP 400 Bad Request', async () => {
      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.2.4',
        },
        body: 'invalid-non-json-string',
      });

      assert.strictEqual(res.status, 400);
    });
  });

  describe('3. Rate Limiting Proportional Quota Consumption', () => {
    it('consumes tokens proportional to batch size (6 x 5-job requests exhaust 30-token quota)', async () => {
      const testIp = '198.51.100.77';

      // 6 requests with 5 jobs = 30 tokens consumed (limit is 30)
      for (let reqIdx = 0; reqIdx < 6; reqIdx++) {
        const res = await app.request('/api/analyze/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({
            resumeData: sampleResume,
            jobs: [
              { jobText: jobDescription1 },
              { jobText: jobDescription2 },
              { jobText: jobDescription3 },
              { jobText: jobDescription4 },
              { jobText: jobDescription5 },
            ],
          }),
        });

        assert.strictEqual(
          res.status,
          200,
          `Request ${reqIdx + 1} of 6 (5 jobs each) should succeed within 30-token limit`
        );
      }

      // 7th request from same IP (even with 1 job) should be rate limited with HTTP 429
      const overLimitRes = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          jobs: [{ jobText: jobDescription1 }],
        }),
      });

      assert.strictEqual(overLimitRes.status, 429);
      const errorData: any = await overLimitRes.json();
      assert.ok(errorData.error.includes('Too many requests'));
    });

    it('consumes 3 tokens for 3-job request (10 x 3-job requests exhaust 30-token quota)', async () => {
      const testIp = '198.51.100.88';

      // 10 requests with 3 jobs = 30 tokens consumed
      for (let reqIdx = 0; reqIdx < 10; reqIdx++) {
        const res = await app.request('/api/analyze/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({
            resumeData: sampleResume,
            jobs: [
              { jobText: jobDescription1 },
              { jobText: jobDescription2 },
              { jobText: jobDescription3 },
            ],
          }),
        });

        assert.strictEqual(
          res.status,
          200,
          `Request ${reqIdx + 1} of 10 (3 jobs each) should succeed within quota`
        );
      }

      // 11th request should be blocked by rate limit
      const overLimitRes = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          jobs: [{ jobText: jobDescription1 }],
        }),
      });

      assert.strictEqual(overLimitRes.status, 429);
    });
  });

  describe('4. Batch Error Isolation (SSRF rejection & fetch failure)', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('isolates SSRF blocked URL error, ensuring other jobs in batch process successfully', async () => {
      // Mock fetcher call: simulate ats-job-fetcher SSRF block on 127.0.0.1
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/fetch-job')) {
          const bodyStr = init?.body?.toString() || '{}';
          const parsed = JSON.parse(bodyStr);

          if (parsed.url && (parsed.url.includes('127.0.0.1') || parsed.url.includes('localhost'))) {
            return new Response(
              JSON.stringify({
                error: 'SSRF blocked: Fetching from private or loopback IP range (127.0.0.1) is strictly prohibited.',
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }

          if (parsed.url && parsed.url.includes('careers.example.com')) {
            return new Response(
              JSON.stringify({
                title: 'Remote DevOps Engineer',
                text: 'We are hiring a Remote DevOps Engineer skilled in Docker, Kubernetes, Linux, and CI/CD pipelines with at least 3 years experience.',
                siteName: 'careers.example.com',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        return originalFetch(input, init);
      };

      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.4.1',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          language: 'en',
          jobs: [
            // Job 0: Valid text job (must succeed)
            { jobTitle: 'Valid Text Job', jobText: jobDescription1 },
            // Job 1: Malicious SSRF loopback URL (must fail gracefully)
            { jobTitle: 'Internal Admin Job', jobUrl: 'http://127.0.0.1/admin/internal-job' },
            // Job 2: Valid external URL job (must succeed)
            { jobTitle: 'External Remote Job', jobUrl: 'https://careers.example.com/job/123' },
          ],
        }),
      });

      assert.strictEqual(res.status, 200, 'Batch should return 200 even with partial job failures');
      const data: any = await res.json();

      // Schema validation MUST succeed on the entire response
      const parseResult = BatchAnalysisResponseSchema.safeParse(data);
      assert.ok(
        parseResult.success,
        `BatchAnalysisResponseSchema failed validation: ${JSON.stringify(parseResult.error?.issues)}`
      );

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.totalJobs, 3);
      assert.strictEqual(data.processedJobs, 3);
      assert.strictEqual(data.successCount, 2, 'Two jobs should succeed, one should fail');
      assert.strictEqual(data.results.length, 3);

      // Job 0: Succeeded
      assert.strictEqual(data.results[0].jobIndex, 0);
      assert.ok(data.results[0].overallScore > 0);
      assert.strictEqual(data.results[0].error, undefined);
      assert.ok(SubScoresSchema.safeParse(data.results[0].subScores).success);

      // Job 1: Failed with SSRF block
      assert.strictEqual(data.results[1].jobIndex, 1);
      assert.strictEqual(data.results[1].overallScore, 0);
      assert.ok(data.results[1].error);
      assert.ok(data.results[1].error.includes('SSRF blocked'));

      // Crucial: fallback subScores MUST pass SubScoresSchema
      const failedSubScoresValidation = SubScoresSchema.safeParse(data.results[1].subScores);
      assert.ok(
        failedSubScoresValidation.success,
        `Fallback subScores failed SubScoresSchema: ${JSON.stringify(failedSubScoresValidation.error?.issues)}`
      );
      assert.strictEqual(data.results[1].subScores.keywordMatch.score, 0);
      assert.strictEqual(data.results[1].subScores.formatParseability.score, 0);
      assert.strictEqual(data.results[1].subScores.experienceFit.score, 0);
      assert.strictEqual(data.results[1].subScores.sectionCompleteness.score, 0);

      // Job 2: Succeeded via URL
      assert.strictEqual(data.results[2].jobIndex, 2);
      assert.ok(data.results[2].overallScore > 0);
      assert.strictEqual(data.results[2].error, undefined);
      assert.ok(SubScoresSchema.safeParse(data.results[2].subScores).success);

      // Verify errors array in response
      assert.ok(data.errors);
      assert.strictEqual(data.errors.length, 1);
      assert.strictEqual(data.errors[0].jobIndex, 1);
      assert.ok(data.errors[0].error.includes('SSRF blocked'));

      // bestMatch must be one of the successful jobs (not the failed one)
      assert.ok(data.bestMatch);
      assert.notStrictEqual(data.bestMatch.jobIndex, 1);
      assert.ok(data.bestMatch.overallScore > 0);
    });

    it('isolates network/fetch failure when ats-job-fetcher service is unreachable', async () => {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('/api/fetch-job')) {
          throw new Error('ECONNREFUSED: Connection refused to ats-job-fetcher:3001');
        }
        return originalFetch(input, init);
      };

      const res = await app.request('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.100.4.2',
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          jobs: [
            { jobTitle: 'Valid Text Job', jobText: jobDescription1 },
            { jobTitle: 'Unreachable Fetcher Job', jobUrl: 'https://example.com/job/fail' },
          ],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();

      const parseResult = BatchAnalysisResponseSchema.safeParse(data);
      assert.ok(parseResult.success);

      assert.strictEqual(data.totalJobs, 2);
      assert.strictEqual(data.processedJobs, 2);
      assert.strictEqual(data.successCount, 1);
      assert.strictEqual(data.results[0].error, undefined);
      assert.ok(data.results[1].error.includes('ECONNREFUSED'));
      assert.strictEqual(data.results[1].overallScore, 0);
      assert.ok(SubScoresSchema.safeParse(data.results[1].subScores).success);
    });
  });
});
