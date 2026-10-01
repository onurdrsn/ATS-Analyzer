import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXPORT_MIME_TYPES,
  type ResumeStructure,
  type Language,
} from '@ats-analyzer/contracts';
import { generateLatexResume } from '../src/lib/export/latex.js';
import { generateDocxResume } from '../src/lib/export/docx.js';
import { generatePdfResume } from '../src/lib/export/pdf.js';
import { exportResumeDocument } from '../src/lib/export/index.js';
import { escapeLatex, resolveSectionTitles, formatPresentDate } from '../src/lib/export/utils.js';
import app from '../src/index.js';

// Comprehensive test resume data
const richResumeEn: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'Alice Smith',
    email: 'alice.smith@example.com',
    phone: '+1-555-0100',
    links: ['https://github.com/alicesmith', 'https://linkedin.com/in/alicesmith'],
  },
  summary: 'Senior Cloud Architect with 10+ years designing resilient distributed systems.',
  experience: [
    {
      company: 'Acme Cloud Corp',
      title: 'Principal Engineer',
      startDate: '2021-01',
      endDate: '', // Present
      description: 'Architecting multi-region Kubernetes clusters.',
      bullets: [
        'Designed zero-downtime database failover protocol',
        'Cut infrastructure cloud spend by 35% through spot instance bin-packing',
      ],
    },
    {
      company: 'Legacy Systems Ltd',
      title: 'Software Engineer',
      startDate: '2016-06',
      endDate: '2020-12',
      description: 'Maintained enterprise ERP platforms.',
      bullets: ['Migrated monolithic Java services to Go microservices'],
    },
  ],
  education: [
    {
      institution: 'State University',
      degree: 'M.S. in Computer Engineering',
      startDate: '2014-09',
      endDate: '2016-05',
    },
  ],
  skills: ['TypeScript', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'Terraform'],
  projects: [
    {
      name: 'KubeWatchdog',
      description: 'Autonomous health check sidecar for containerized workloads.',
      link: 'https://github.com/example/kubewatchdog',
    },
  ],
};

const richResumeTr: ResumeStructure = {
  language: 'tr',
  contact: {
    name: 'Çağrı Şengül',
    email: 'cagri.sengul@ornek.com',
    phone: '+90 555 123 4567',
    links: ['https://github.com/cagrisengul', 'https://linkedin.com/in/cagrisengul'],
  },
  summary: 'Türkçe karakter desteği: ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ö, Ş, Ü içeren özet metni.',
  experience: [
    {
      company: 'Ağ Çözümleri Bilişim A.Ş.',
      title: 'Kıdemli Dağıtık Sistemler Mühendisi',
      startDate: '2020-03',
      endDate: '', // Devam Ediyor
      description: 'Yüksek ölçekli bulut altyapılarının yönetimi ve geliştirilmesi.',
      bullets: [
        'Dağıtık mesaj kuyruğu optimizasyonu ile gecikme süreleri %40 düşürüldü',
        'Özgün şifreleme ve güvenlik mimarisi tasarlandı',
      ],
    },
  ],
  education: [
    {
      institution: 'Orta Doğu Teknik Üniversitesi',
      degree: 'Bilgisayar Mühendisliği Lisans',
      startDate: '2015-09',
      endDate: '2019-06',
    },
  ],
  skills: ['Türkçe', 'Özgün Kodlama', 'İleri Düzey Algoritmalar', 'Bulut Bilişim', 'Ağ Güvenliği'],
  projects: [
    {
      name: 'Açık Kaynak Dağıtık Ağ',
      description: 'Yüksek verimli Türkçe doğal dil işleme destekli arama motoru.',
      link: 'https://github.com/ornek/dagitik-ag',
    },
  ],
};

const minimalResume: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'John Minimal',
    email: 'john@minimal.com',
    links: [],
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

describe('Empirical Adversarial Challenge Suite: Bilingual Export Engine', () => {
  // =========================================================================
  // REQUIREMENT 1: All 3 Formats in Turkish ('tr') and English ('en')
  // =========================================================================
  describe('Req 1: Generation of all 3 formats (PDF, DOCX, LaTeX) in en and tr', () => {
    it('1.1: Generates valid PDF in English with expected headers and content', async () => {
      const buf = await generatePdfResume(richResumeEn, 'en');
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 2000, `PDF size was too small: ${buf.length}`);
      assert.strictEqual(buf.subarray(0, 5).toString('ascii'), '%PDF-');
    });

    it('1.2: Generates valid PDF in Turkish with expected headers and content', async () => {
      const buf = await generatePdfResume(richResumeTr, 'tr');
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 2000, `PDF size was too small: ${buf.length}`);
      assert.strictEqual(buf.subarray(0, 5).toString('ascii'), '%PDF-');
    });

    it('1.3: Generates valid DOCX in English with ZIP magic bytes', async () => {
      const buf = await generateDocxResume(richResumeEn, 'en');
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 2000, `DOCX size was too small: ${buf.length}`);
      // ZIP magic bytes PK\x03\x04
      assert.strictEqual(buf[0], 0x50);
      assert.strictEqual(buf[1], 0x4b);
      assert.strictEqual(buf[2], 0x03);
      assert.strictEqual(buf[3], 0x04);
    });

    it('1.4: Generates valid DOCX in Turkish with ZIP magic bytes', async () => {
      const buf = await generateDocxResume(richResumeTr, 'tr');
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 2000, `DOCX size was too small: ${buf.length}`);
      assert.strictEqual(buf[0], 0x50);
      assert.strictEqual(buf[1], 0x4b);
      assert.strictEqual(buf[2], 0x03);
      assert.strictEqual(buf[3], 0x04);
    });

    it('1.5: Generates valid LaTeX markup in English with document structure', () => {
      const tex = generateLatexResume(richResumeEn, 'en');
      assert.ok(typeof tex === 'string');
      assert.ok(tex.includes('\\documentclass[10pt,a4paper]{article}'));
      assert.ok(tex.includes('\\begin{document}'));
      assert.ok(tex.includes('\\end{document}'));
      assert.ok(tex.includes('Alice Smith'));
      assert.ok(tex.includes('Work Experience') || tex.includes('WORK EXPERIENCE'));
      assert.ok(tex.includes('Present'));
    });

    it('1.6: Generates valid LaTeX markup in Turkish with document structure', () => {
      const tex = generateLatexResume(richResumeTr, 'tr');
      assert.ok(typeof tex === 'string');
      assert.ok(tex.includes('\\documentclass[10pt,a4paper]{article}'));
      assert.ok(tex.includes('\\begin{document}'));
      assert.ok(tex.includes('\\end{document}'));
      assert.ok(tex.includes('Çağrı Şengül'));
      assert.ok(tex.includes('İş Deneyimi') || tex.includes('İŞ DENEYİMİ'));
      assert.ok(tex.includes('Devam Ediyor'));
    });

    it('1.7: Minimal resume does not crash any of the 3 formats', async () => {
      const pdf = await generatePdfResume(minimalResume, 'en');
      assert.ok(pdf.length > 500);

      const docx = await generateDocxResume(minimalResume, 'en');
      assert.ok(docx.length > 500);

      const tex = generateLatexResume(minimalResume, 'en');
      assert.ok(tex.includes('John Minimal'));
    });

    it('1.8: Custom section titles properly override defaults across generators', async () => {
      const customResume: ResumeStructure = {
        ...richResumeEn,
        sectionTitles: {
          summary: 'Executive Profile',
          experience: 'Career History',
          education: 'Academic Background',
          skills: 'Core Competencies',
          projects: 'Key Deliverables',
        },
      };

      const tex = generateLatexResume(customResume, 'en');
      assert.ok(tex.includes('Executive Profile'));
      assert.ok(tex.includes('Career History'));
      assert.ok(tex.includes('Academic Background'));
      assert.ok(tex.includes('Core Competencies'));
      assert.ok(tex.includes('Key Deliverables'));
    });

    it('1.9: Date formatting renders "Present" in en and "Devam Ediyor" in tr', () => {
      assert.strictEqual(formatPresentDate('en'), 'Present');
      assert.strictEqual(formatPresentDate('tr'), 'Devam Ediyor');
    });
  });

  // =========================================================================
  // REQUIREMENT 2: LaTeX Character Escaping (% $ & _ # { } ~ ^ \)
  // =========================================================================
  describe('Req 2: LaTeX character escaping (% $ & _ # { } ~ ^ \\)', () => {
    it('2.1: Individual special character escaping tests', () => {
      assert.strictEqual(escapeLatex('%'), '\\%');
      assert.strictEqual(escapeLatex('$'), '\\$');
      assert.strictEqual(escapeLatex('&'), '\\&');
      assert.strictEqual(escapeLatex('_'), '\\_');
      assert.strictEqual(escapeLatex('#'), '\\#');
      assert.strictEqual(escapeLatex('{'), '\\{');
      assert.strictEqual(escapeLatex('}'), '\\}');
      assert.strictEqual(escapeLatex('~'), '\\textasciitilde{}');
      assert.strictEqual(escapeLatex('^'), '\\textasciicircum{}');
    });

    it('2.2: Combined stress string containing all 10 characters', () => {
      const input = 'C# & C++: 100% bug-free $50 budget with #1 tag and {block} at ~home with x^2 and \\dir';
      const escaped = escapeLatex(input);

      // Verify no raw unescaped special characters
      assert.ok(!escaped.includes(' & '));
      assert.ok(!escaped.includes(' 100% '));
      assert.ok(!escaped.includes(' $50 '));
      assert.ok(!escaped.includes(' #1 '));
      assert.ok(!escaped.includes(' {block} '));
      assert.ok(!escaped.includes(' ~home '));
      assert.ok(!escaped.includes(' x^2 '));
    });

    it('2.3: [REMEDIATED] Backslash escaping produces "\\textbackslash{}" instead of "\\textbackslash\\{\\}"', () => {
      const input = 'C:\\Projects\\ATS';
      const escaped = escapeLatex(input);

      assert.strictEqual(escaped, 'C:\\textbackslash{}Projects\\textbackslash{}ATS');
      assert.ok(
        !escaped.includes('\\textbackslash\\{\\}'),
        'Verified: escapeLatex does not double-escape braces inside textbackslash'
      );
    });

    it('2.4: Resume with heavy special characters generates LaTeX without parse crash', () => {
      const adversarialResume: ResumeStructure = {
        language: 'en',
        contact: {
          name: 'Jane #1 C&A $pecialist',
          email: 'jane_doe%test@example.com',
          phone: '+1_555_{0199}',
          links: ['https://example.com/search?q=100%25&tag=dev#heading_1'],
        },
        summary: 'Expert in C# & C++, working with 100% test coverage, $2M+ budget, #1 ranking, {JSON} schemas, ~5 yrs exp, O(n^2) analysis, and C:\\Windows paths.',
        experience: [
          {
            company: 'Tech_Corp & Sons #9',
            title: 'Lead Architect (C# / C++) & $ME',
            startDate: '2020-01',
            endDate: '2024-01',
            description: 'Maintained 99.99% SLA & handled {key: "value"} payloads under ~10ms.',
            bullets: [
              'Refactored legacy code with regex: ^[a-z_]+$',
              'Resolved issue #42 & saved $100K/yr',
            ],
          },
        ],
        education: [
          {
            institution: 'Dept. of CS & Engineering',
            degree: 'B.S. in Math & CS (GPA: 3.9/4.0, Top 1%)',
            startDate: '2016-09',
            endDate: '2020-06',
          },
        ],
        skills: ['C#', 'C++', 'LaTeX % Formatting', 'Regex ^[0-9]+$', 'Folder C:\\System', '{REST}', '~$100'],
        projects: [
          {
            name: 'OpenATS & Optimizer #1',
            description: 'Built with 100% TypeScript & $0 cloud cost using ~20 microservices.',
            link: 'https://github.com/example/open_ats#readme',
          },
        ],
      };

      const tex = generateLatexResume(adversarialResume, 'en');
      assert.ok(typeof tex === 'string');
      assert.ok(tex.includes('\\documentclass'));
      assert.ok(tex.includes('\\end{document}'));

      // Check balance of braces in the generated document
      let openBraces = 0;
      let escapedOpenBraces = 0;
      for (let i = 0; i < tex.length; i++) {
        if (tex[i] === '{') {
          if (i > 0 && tex[i - 1] === '\\') {
            escapedOpenBraces++;
          } else {
            openBraces++;
          }
        } else if (tex[i] === '}') {
          if (i > 0 && tex[i - 1] === '\\') {
            // escaped close brace
          } else {
            openBraces--;
          }
        }
      }
      // Structural TeX braces must be balanced
      assert.strictEqual(openBraces, 0, `Unbalanced TeX structural braces found! Delta: ${openBraces}`);
    });
  });

  // =========================================================================
  // REQUIREMENT 3: Turkish Diacritics Preservation
  // =========================================================================
  describe('Req 3: Turkish diacritics preservation (ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ö, Ş, Ü)', () => {
    const allTurkishChars = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'İ', 'Ç', 'Ğ', 'Ö', 'Ş', 'Ü'];

    it('3.1: PDF generator embeds TrueType fonts and pdftotext extracts all 12 Turkish characters', async () => {
      const pdfBuf = await generatePdfResume(richResumeTr, 'tr');
      assert.ok(Buffer.isBuffer(pdfBuf));
      assert.ok(pdfBuf.length > 5000);

      const tmpFile = `/tmp/test_pdf_diacritics_${Date.now()}.pdf`;
      fs.writeFileSync(tmpFile, pdfBuf);

      try {
        const extractedText = execSync(`pdftotext "${tmpFile}" -`, { encoding: 'utf-8' });
        for (const char of allTurkishChars) {
          assert.ok(
            extractedText.includes(char),
            `Character '${char}' (code ${char.charCodeAt(0)}) was missing or corrupted in PDF text extraction!`
          );
        }
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it('3.2: [REMEDIATED] PDF & DOCX section title uppercasing correctly preserves Turkish dotted "İ"', async () => {
      // In Turkish:
      // "Eğitim" uppercase must be "EĞİTİM" (with dotted İ)
      // "İş Deneyimi" uppercase must be "İŞ DENEYİMİ" (with dotted İ)
      const pdfBuf = await generatePdfResume(richResumeTr, 'tr');
      const tmpPdf = `/tmp/test_pdf_turkish_i_${Date.now()}.pdf`;
      fs.writeFileSync(tmpPdf, pdfBuf);

      try {
        const extractedText = execSync(`pdftotext "${tmpPdf}" -`, { encoding: 'utf-8' });
        const hasCorruptedEgitim = extractedText.includes('EĞITIM');
        const hasCorrectEgitim = extractedText.includes('EĞİTİM');
        const hasCorruptedIsDeneyimi = extractedText.includes('İŞ DENEYIMI');
        const hasCorrectIsDeneyimi = extractedText.includes('İŞ DENEYİMİ');

        assert.ok(
          hasCorrectEgitim,
          'Verified: .toLocaleUpperCase("tr-TR") converted "Eğitim" to "EĞİTİM"'
        );
        assert.ok(
          hasCorrectIsDeneyimi,
          'Verified: .toLocaleUpperCase("tr-TR") converted "İş Deneyimi" to "İŞ DENEYİMİ"'
        );
        assert.ok(
          !hasCorruptedEgitim,
          'Verified: "Eğitim" was not corrupted to "EĞITIM"'
        );
      } finally {
        if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
      }
    });

    it('3.3: DOCX generator preserves all 12 Turkish characters in word/document.xml', async () => {
      const docxBuf = await generateDocxResume(richResumeTr, 'tr');
      assert.ok(Buffer.isBuffer(docxBuf));

      const tmpDocx = `/tmp/test_docx_diacritics_${Date.now()}.docx`;
      fs.writeFileSync(tmpDocx, docxBuf);

      try {
        const xml = execSync(`unzip -p "${tmpDocx}" word/document.xml`, { encoding: 'utf-8' });
        for (const char of allTurkishChars) {
          assert.ok(
            xml.includes(char),
            `Character '${char}' (code ${char.charCodeAt(0)}) was missing or corrupted in DOCX XML!`
          );
        }
        // Check Turkish-I in DOCX section headers
        assert.ok(xml.includes('EĞİTİM'), 'DOCX contains EĞİTİM with proper dotted İ');
      } finally {
        if (fs.existsSync(tmpDocx)) fs.unlinkSync(tmpDocx);
      }
    });

    it('3.4: LaTeX generator preserves all 12 Turkish characters and declares UTF-8 inputenc', () => {
      const tex = generateLatexResume(richResumeTr, 'tr');
      assert.ok(tex.includes('\\usepackage[utf8]{inputenc}'));
      assert.ok(tex.includes('\\usepackage[T1]{fontenc}'));

      for (const char of allTurkishChars) {
        assert.ok(
          tex.includes(char),
          `Character '${char}' (code ${char.charCodeAt(0)}) was missing or corrupted in LaTeX source!`
        );
      }
    });
  });

  // =========================================================================
  // REQUIREMENT 4: Download Headers (Content-Type, Content-Disposition RFC 5987 / RFC 6266)
  // =========================================================================
  describe('Req 4: Download headers (Content-Type, RFC 5987 / RFC 6266 filename*)', () => {
    it('4.1: POST /api/export sets correct Content-Type for all 3 formats', async () => {
      for (const format of ['pdf', 'docx', 'tex'] as const) {
        const req = new Request('http://localhost:3000/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeData: richResumeEn,
            format,
            language: 'en',
          }),
        });

        const res = await app.fetch(req);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('Content-Type'), EXPORT_MIME_TYPES[format]);
        assert.strictEqual(
          res.headers.get('Cache-Control'),
          'no-store, no-cache, must-revalidate, private'
        );
        assert.ok(Number(res.headers.get('Content-Length')) > 0);
      }
    });

    it('4.2: [REMEDIATED] Turkish dotless "ı" in ASCII fallback is transliterated to "i" ("Cagri_Sengul_tr.pdf")', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: richResumeTr,
          format: 'pdf',
          language: 'tr',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);
      const disposition = res.headers.get('Content-Disposition');
      assert.ok(disposition, 'Content-Disposition header must be present');
      assert.ok(disposition.startsWith('attachment;'));

      // Check ASCII fallback: U+0131 (ı) is transliterated to 'i'
      assert.ok(
        disposition.includes('filename="Cagri_Sengul_tr.pdf"'),
        `Expected ASCII fallback filename="Cagri_Sengul_tr.pdf", got: ${disposition}`
      );

      // Check RFC 5987 UTF-8 encoded filename: filename*=UTF-8''...
      assert.ok(
        disposition.includes("filename*=UTF-8''"),
        `Expected RFC 5987 filename*=UTF-8'', got: ${disposition}`
      );

      // Verify that %C3%87 (%C3%A7 for 'ç') or similar percent-encodings are present
      assert.ok(
        disposition.includes('%C3%87') || disposition.includes('%C3%A7'),
        `Expected percent-encoded Turkish characters in filename*, got: ${disposition}`
      );
    });

    it('4.3: [REMEDIATED] Single quote in name (O\'Connor) is percent-encoded as %27 in RFC 5987 filename*', async () => {
      const oconnorResume: ResumeStructure = {
        ...richResumeEn,
        contact: {
          ...richResumeEn.contact,
          name: "John O'Connor",
        },
      };

      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: oconnorResume,
          format: 'pdf',
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 200);
      const disposition = res.headers.get('Content-Disposition') || '';

      const hasEncodedSingleQuote = disposition.includes("filename*=UTF-8''John_O%27Connor_en.pdf");
      assert.ok(
        hasEncodedSingleQuote,
        `Verified: single quote is percent-encoded as %27 in filename*: ${disposition}`
      );
      assert.ok(
        !disposition.includes("filename*=UTF-8''John_O'Connor_en.pdf"),
        'Single quote must not be left unencoded'
      );
    });

    it('4.4: Export endpoint rejects invalid formats with 400 Bad Request', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: richResumeEn,
          format: 'exe',
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 400);
      const json: any = await res.json();
      assert.strictEqual(json.error, 'Validation failed for export request');
    });

    it('4.5: Export endpoint rejects missing contact info with 400 Bad Request', async () => {
      const invalidResume = {
        language: 'en',
        // missing contact
        summary: 'No contact info',
        experience: [],
        education: [],
        skills: [],
      };

      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: invalidResume,
          format: 'pdf',
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      assert.strictEqual(res.status, 400);
    });

    it('4.6: Export endpoint returns Base64 JSON when output=base64 is specified in body', async () => {
      const req = new Request('http://localhost:3000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: richResumeEn,
          format: 'pdf',
          language: 'en',
          output: 'base64',
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

      // Verify that the base64 content decodes to valid PDF magic bytes
      const decoded = Buffer.from(json.contentBase64, 'base64');
      assert.strictEqual(decoded.subarray(0, 5).toString('ascii'), '%PDF-');
    });
  });
});
