import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateLatexSource, escapeLatex } from '../src/lib/latexGenerator';
import { generateWordHtmlDocument } from '../src/lib/docxFallback';
import { SAMPLE_RESUME_EN, SAMPLE_RESUME_TR } from '../src/i18n/samples';
import { ExportResumeRequestSchema } from '@ats-analyzer/contracts';

describe('LaTeX Generator (Client-Side)', () => {
  it('should escape LaTeX reserved characters correctly', () => {
    assert.equal(
      escapeLatex('100% C# & R&D with $500 _underscore_ {braces} ~tilde ^caret'),
      '100\\% C\\# \\& R\\&D with \\$500 \\_underscore\\_ \\{braces\\} \\textasciitilde{}tilde \\textasciicircum{}caret'
    );
    assert.equal(escapeLatex('\\backslash'), '\\textbackslash{}backslash');
  });

  it('should generate English LaTeX resume with correct sections', () => {
    const tex = generateLatexSource(SAMPLE_RESUME_EN, 'en');

    assert.ok(tex.includes('\\textbf{Alex Developer}'));
    assert.ok(tex.includes('\\section*{Work Experience}'));
    assert.ok(tex.includes('\\section*{Skills}'));
    assert.ok(tex.includes('\\section*{Education}'));
    assert.ok(tex.includes('\\section*{Professional Summary}'));
    assert.ok(tex.includes('CloudTech Systems'));
    assert.ok(tex.includes('Present'));
  });

  it('should generate Turkish LaTeX resume with correct sections and Turkish diacritics', () => {
    const tex = generateLatexSource(SAMPLE_RESUME_TR, 'tr');

    assert.ok(tex.includes('\\textbf{Can Yılmaz}'));
    assert.ok(tex.includes('\\section*{İş Deneyimi}'));
    assert.ok(tex.includes('\\section*{Yetenekler}'));
    assert.ok(tex.includes('\\section*{Eğitim}'));
    assert.ok(tex.includes('\\section*{Profesyonel Özet}'));
    assert.ok(tex.includes('Bulut Bilişim Sistemleri'));
    assert.ok(tex.includes('Günümüz'));
    assert.ok(tex.includes('\\usepackage[utf8]{inputenc}'));
  });

  it('should generate LaTeX documents with perfectly balanced curly braces', () => {
    const resumes = [
      { lang: 'en' as const, data: SAMPLE_RESUME_EN },
      { lang: 'tr' as const, data: SAMPLE_RESUME_TR },
    ];

    for (const { lang, data } of resumes) {
      const tex = generateLatexSource(data, lang);

      let openBraces = 0;
      let closeBraces = 0;
      for (let i = 0; i < tex.length; i++) {
        if (tex[i] === '{') openBraces++;
        if (tex[i] === '}') closeBraces++;
      }

      assert.equal(
        openBraces,
        closeBraces,
        `Mismatched curly braces in ${lang} resume: open=${openBraces}, close=${closeBraces}`
      );
    }
  });

  it('should not emit rogue double closing braces in item titles or degrees', () => {
    const texEn = generateLatexSource(SAMPLE_RESUME_EN, 'en');
    assert.ok(texEn.includes('\\textbf{Senior Software Engineer}'));
    assert.ok(!texEn.includes('\\textbf{Senior Software Engineer}}'));
    assert.ok(texEn.includes('\\textbf{B.S. in Computer Science}'));
    assert.ok(!texEn.includes('\\textbf{B.S. in Computer Science}}'));

    const texTr = generateLatexSource(SAMPLE_RESUME_TR, 'tr');
    assert.ok(texTr.includes('\\textbf{Kıdemli Yazılım Mühendisi}'));
    assert.ok(!texTr.includes('\\textbf{Kıdemli Yazılım Mühendisi}}'));
    assert.ok(texTr.includes('\\textbf{Bilgisayar Mühendisliği Lisans}'));
    assert.ok(!texTr.includes('\\textbf{Bilgisayar Mühendisliği Lisans}}'));
  });

  it('should maintain balanced braces even when resume content contains braces and special characters', () => {
    const edgeResume = {
      ...SAMPLE_RESUME_EN,
      skills: ['C++', 'React {Hooks}', 'JSON & XML'],
      experience: [
        {
          title: 'Staff Engineer {Platform}',
          company: 'TechCorp & Co.',
          startDate: '2020',
          endDate: '2022',
          description: 'Working with {nested} systems',
          bullets: ['Built {fast} API'],
        },
      ],
      education: [
        {
          degree: 'M.S. in Computer Science {Distributed Systems}',
          institution: 'MIT & Harvard',
          startDate: '2016',
          endDate: '2018',
        },
      ],
    };

    const tex = generateLatexSource(edgeResume, 'en');
    let openBraces = 0;
    let closeBraces = 0;
    for (let i = 0; i < tex.length; i++) {
      if (tex[i] === '{') openBraces++;
      if (tex[i] === '}') closeBraces++;
    }
    assert.equal(openBraces, closeBraces, `Mismatched braces with special characters: open=${openBraces}, close=${closeBraces}`);
  });
});

describe('Word HTML Generator (DOCX Fallback)', () => {
  it('should generate valid Word HTML document in English', () => {
    const html = generateWordHtmlDocument(SAMPLE_RESUME_EN, 'en');

    assert.ok(html.includes('urn:schemas-microsoft-com:office:word'));
    assert.ok(html.includes('Alex Developer'));
    assert.ok(html.includes('<h2>Work Experience</h2>'));
    assert.ok(html.includes('<h2>Skills</h2>'));
    assert.ok(html.includes('<h2>Education</h2>'));
    assert.ok(html.includes('Present'));
  });

  it('should generate valid Word HTML document in Turkish', () => {
    const html = generateWordHtmlDocument(SAMPLE_RESUME_TR, 'tr');

    assert.ok(html.includes('urn:schemas-microsoft-com:office:word'));
    assert.ok(html.includes('Can Yılmaz'));
    assert.ok(html.includes('<h2>İş Deneyimi</h2>'));
    assert.ok(html.includes('<h2>Yetenekler</h2>'));
    assert.ok(html.includes('<h2>Eğitim</h2>'));
    assert.ok(html.includes('Günümüz'));
  });
});

describe('Export Schema Contract Conformance', () => {
  it('should validate export request objects for all formats and languages against ExportResumeRequestSchema', () => {
    const formats = ['pdf', 'docx', 'tex'] as const;
    const languages = ['en', 'tr'] as const;

    for (const fmt of formats) {
      for (const lang of languages) {
        const payload = {
          resumeData: lang === 'tr' ? SAMPLE_RESUME_TR : SAMPLE_RESUME_EN,
          format: fmt,
          language: lang,
        };

        const result = ExportResumeRequestSchema.safeParse(payload);
        assert.ok(result.success, `Schema validation failed for format=${fmt}, lang=${lang}: ${result.error?.message}`);
        assert.equal(result.data.format, fmt);
        assert.equal(result.data.language, lang);
      }
    }
  });
});
