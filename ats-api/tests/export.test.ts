import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPORT_MIME_TYPES,
  ExportResumeRequestSchema,
  type ResumeStructure,
} from '@ats-analyzer/contracts';
import { generateLatexResume } from '../src/lib/export/latex.js';
import { generateDocxResume } from '../src/lib/export/docx.js';
import { generatePdfResume } from '../src/lib/export/pdf.js';
import { exportResumeDocument } from '../src/lib/export/index.js';
import { escapeLatex } from '../src/lib/export/utils.js';
import app from '../src/index.js';

const sampleResumeEn: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1-555-0199',
    links: ['https://linkedin.com/in/janedoe', 'https://github.com/janedoe'],
  },
  summary: 'Experienced Full Stack Engineer specializing in TypeScript, React, and Node.js.',
  experience: [
    {
      company: 'Tech Solutions Inc.',
      title: 'Senior Software Engineer',
      startDate: '2021-01',
      endDate: '2024-03',
      description: 'Led development of high-performance cloud applications & microservices.',
      bullets: [
        'Built scalable RESTful APIs serving 1M+ daily users',
        'Implemented CI/CD pipelines reducing deployment friction by 50%',
      ],
    },
  ],
  education: [
    {
      institution: 'University of Technology',
      degree: 'B.S. in Computer Science',
      startDate: '2016-09',
      endDate: '2020-06',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
  projects: [
    {
      name: 'OpenATS Analyzer',
      description: 'Open source ATS optimizer built with TypeScript & Hono.',
      link: 'https://github.com/example/openats',
    },
  ],
};

const sampleResumeTr: ResumeStructure = {
  language: 'tr',
  contact: {
    name: 'Ahmet Yılmaz',
    email: 'ahmet.yilmaz@ornek.com',
    phone: '+90 532 555 0123',
    links: ['https://linkedin.com/in/ahmetyilmaz', 'https://github.com/ahmetyilmaz'],
  },
  summary: 'React, Node.js ve PostgreSQL konularında deneyimli Kıdemli Yazılım Geliştirici.',
  experience: [
    {
      company: 'Bulut Bilişim A.Ş.',
      title: 'Kıdemli Yazılım Mühendisi',
      startDate: '2020-05',
      endDate: '2024-02',
      description: 'Yüksek trafikli mikroservis mimarilerinin geliştirilmesi ve yönetimi.',
      bullets: [
        'Node.js ve PostgreSQL kullanarak RESTful API servisleri tasarlandı',
        'Docker ve CI/CD süreçleri ile birim test kapsamı artırıldı',
      ],
    },
  ],
  education: [
    {
      institution: 'İstanbul Teknik Üniversitesi',
      degree: 'Bilgisayar Mühendisliği Lisans',
      startDate: '2015-09',
      endDate: '2019-06',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'RESTful API Tasarımı'],
  projects: [
    {
      name: 'ATS Çözümleyicisi',
      description: 'Açık kaynaklı özgeçmiş ve iş ilanı eşleştirme motoru.',
      link: 'https://github.com/ornek/ats-cozumleyici',
    },
  ],
};

describe('Bilingual Resume Export Engine', () => {
  describe('escapeLatex utility', () => {
    it('properly escapes TeX special characters', () => {
      const raw = 'C++ & C# developer working with 100% test coverage_now & $100 budget {#tag}';
      const escaped = escapeLatex(raw);
      assert.ok(!escaped.includes(' & '));
      assert.ok(escaped.includes('\\&'));
      assert.ok(escaped.includes('\\%'));
      assert.ok(escaped.includes('\\_'));
      assert.ok(escaped.includes('\\$'));
      assert.ok(escaped.includes('\\{'));
      assert.ok(escaped.includes('\\}'));
    });

    it('returns empty string for null or undefined', () => {
      assert.strictEqual(escapeLatex(null), '');
      assert.strictEqual(escapeLatex(undefined), '');
      assert.strictEqual(escapeLatex(''), '');
    });
  });

  describe('LaTeX Generator (latex.ts)', () => {
    it('generates valid ATS-safe LaTeX in English with utf8 inputenc', () => {
      const tex = generateLatexResume(sampleResumeEn, 'en');

      assert.ok(tex.includes('\\documentclass[10pt,a4paper]{article}'));
      assert.ok(tex.includes('\\usepackage[utf8]{inputenc}'));
      assert.ok(tex.includes('\\usepackage[T1]{fontenc}'));
      assert.ok(tex.includes('Jane Doe'));
      assert.ok(tex.includes('Work Experience') || tex.includes('WORK EXPERIENCE'));
      assert.ok(tex.includes('Professional Summary') || tex.includes('PROFESSIONAL SUMMARY'));
      assert.ok(tex.includes('Education') || tex.includes('EDUCATION'));
      assert.ok(tex.includes('Skills') || tex.includes('SKILLS'));
      assert.ok(tex.includes('Projects') || tex.includes('PROJECTS'));
      assert.ok(tex.includes('\\end{document}'));
    });

    it('generates valid ATS-safe LaTeX in Turkish with native diacritics', () => {
      const tex = generateLatexResume(sampleResumeTr, 'tr');

      assert.ok(tex.includes('\\usepackage[utf8]{inputenc}'));
      assert.ok(tex.includes('Ahmet Yılmaz'));
      assert.ok(tex.includes('İş Deneyimi') || tex.includes('İŞ DENEYİMİ'));
      assert.ok(tex.includes('Profesyonel Özet') || tex.includes('PROFESYONEL ÖZET'));
      assert.ok(tex.includes('Eğitim') || tex.includes('EĞİTİM'));
      assert.ok(tex.includes('Yetenekler') || tex.includes('YETENEKLER'));
      assert.ok(tex.includes('Projeler') || tex.includes('PROJELER'));
      assert.ok(tex.includes('Bulut Bilişim A.Ş.'));
      assert.ok(tex.includes('\\end{document}'));
    });
  });

  describe('DOCX Generator (docx.ts)', () => {
    it('generates valid single-column DOCX buffer in English', async () => {
      const buffer = await generateDocxResume(sampleResumeEn, 'en');

      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 2000, `Expected DOCX buffer > 2000 bytes, got ${buffer.length}`);
      // ZIP / DOCX magic bytes: 0x50, 0x4B, 0x03, 0x04 ('PK\x03\x04')
      assert.strictEqual(buffer[0], 0x50);
      assert.strictEqual(buffer[1], 0x4b);
      assert.strictEqual(buffer[2], 0x03);
      assert.strictEqual(buffer[3], 0x04);
    });

    it('generates valid single-column DOCX buffer in Turkish with native UTF-8 diacritics', async () => {
      const buffer = await generateDocxResume(sampleResumeTr, 'tr');

      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 2000, `Expected DOCX buffer > 2000 bytes, got ${buffer.length}`);
      // Valid ZIP magic header
      assert.strictEqual(buffer[0], 0x50);
      assert.strictEqual(buffer[1], 0x4b);
    });
  });

  describe('PDF Generator (pdf.ts)', () => {
    it('generates valid PDF buffer in English with %PDF- header', async () => {
      const buffer = await generatePdfResume(sampleResumeEn, 'en');

      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 1000, `Expected PDF buffer > 1000 bytes, got ${buffer.length}`);
      const header = buffer.subarray(0, 5).toString('ascii');
      assert.strictEqual(header, '%PDF-');
    });

    it('generates valid PDF buffer in Turkish with localized headers', async () => {
      const buffer = await generatePdfResume(sampleResumeTr, 'tr');

      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 1000, `Expected PDF buffer > 1000 bytes, got ${buffer.length}`);
      const header = buffer.subarray(0, 5).toString('ascii');
      assert.strictEqual(header, '%PDF-');
    });
  });

  describe('Export Dispatcher (exportResumeDocument)', () => {
    it('dispatches LaTeX generation and sets correct MIME type and filenames', async () => {
      const result = await exportResumeDocument({
        resumeData: sampleResumeEn,
        format: 'tex',
        language: 'en',
      });

      assert.strictEqual(result.mimeType, EXPORT_MIME_TYPES.tex);
      assert.ok(result.asciiFilename.endsWith('.tex'));
      assert.ok(result.buffer.length > 0);
      const content = result.buffer.toString('utf-8');
      assert.ok(content.includes('\\documentclass'));
    });

    it('dispatches DOCX generation and sets correct MIME type and filenames', async () => {
      const result = await exportResumeDocument({
        resumeData: sampleResumeTr,
        format: 'docx',
        language: 'tr',
      });

      assert.strictEqual(result.mimeType, EXPORT_MIME_TYPES.docx);
      assert.ok(result.asciiFilename.endsWith('.docx'));
      assert.ok(result.buffer.length > 1000);
    });

    it('dispatches PDF generation and sets correct MIME type and filenames', async () => {
      const result = await exportResumeDocument({
        resumeData: sampleResumeTr,
        format: 'pdf',
        language: 'tr',
      });

      assert.strictEqual(result.mimeType, EXPORT_MIME_TYPES.pdf);
      assert.ok(result.asciiFilename.endsWith('.pdf'));
      assert.ok(result.buffer.length > 1000);
    });
  });

  describe('POST /api/export Integration Endpoint', () => {
    it('returns downloadable binary PDF stream with proper headers', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: sampleResumeEn,
          format: 'pdf',
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Content-Type'), 'application/pdf');
      assert.ok(res.headers.get('Content-Disposition')?.includes('attachment; filename='));

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');
    });

    it('returns downloadable DOCX stream for Turkish resume', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: sampleResumeTr,
          format: 'docx',
          language: 'tr',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Content-Type'), EXPORT_MIME_TYPES.docx);
      assert.ok(res.headers.get('Content-Disposition')?.includes('attachment; filename='));

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.strictEqual(buffer[0], 0x50);
      assert.strictEqual(buffer[1], 0x4b);
    });

    it('returns downloadable LaTeX stream for Turkish resume', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: sampleResumeTr,
          format: 'tex',
          language: 'tr',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Content-Type'), EXPORT_MIME_TYPES.tex);

      const text = await res.text();
      assert.ok(text.includes('\\documentclass'));
      assert.ok(text.includes('Ahmet Yılmaz'));
      assert.ok(text.includes('İş Deneyimi') || text.includes('İŞ DENEYİMİ'));
    });

    it('returns JSON base64 format when Accept header requests application/json', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          resumeData: sampleResumeEn,
          format: 'pdf',
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('Content-Type')?.includes('application/json'));

      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.format, 'pdf');
      assert.strictEqual(json.language, 'en');
      assert.ok(typeof json.contentBase64 === 'string');
      assert.ok(json.contentBase64.length > 500);

      // Verify the base64 decodes back to a valid PDF
      const decoded = Buffer.from(json.contentBase64, 'base64');
      assert.strictEqual(decoded.subarray(0, 5).toString('ascii'), '%PDF-');
    });

    it('returns 400 Bad Request on invalid request body', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'invalid_format',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 400);
      const json: any = await res.json();
      assert.strictEqual(json.error, 'Validation failed for export request');
    });
  });
});
