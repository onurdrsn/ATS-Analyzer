import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  // Language
  LanguageSchema,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type Language,

  // Export
  ExportFormatSchema,
  EXPORT_FORMATS,
  EXPORT_MIME_TYPES,
  ExportResumeRequestSchema,
  ExportResumeResponseSchema,
  type ExportFormat,

  // Resume & Bilingual
  ResumeStructureSchema,
  BilingualResumeSchema,
  LocalizedSectionTitlesSchema,
  DEFAULT_SECTION_TITLES,
  type ResumeStructure,
  type BilingualResume,
} from '../src/index.js';

// Base mock resumes for testing
const baseEnResume: ResumeStructure = {
  language: 'en',
  contact: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 555-0100',
    links: ['https://github.com/janedoe'],
  },
  summary: 'Experienced Full Stack Engineer specialized in high-throughput distributed systems.',
  experience: [
    {
      company: 'Acme Systems Corp',
      title: 'Senior Software Engineer',
      startDate: '2021-01',
      endDate: '2024-06',
      description: 'Led cloud migration project',
      bullets: [
        'Architected polyrepo microservices architecture',
        'Improved system throughput by 45%',
      ],
    },
  ],
  education: [
    {
      institution: 'MIT',
      degree: 'B.S. in Computer Science',
      startDate: '2016-09',
      endDate: '2020-05',
    },
  ],
  skills: ['TypeScript', 'Node.js', 'React', 'Docker'],
  projects: [
    {
      name: 'ATS Analyzer',
      description: 'Open-source ATS resume optimization platform',
      link: 'https://github.com/example/ats',
    },
  ],
};

const baseTrResume: ResumeStructure = {
  language: 'tr',
  contact: {
    name: 'Şükrü Çağlar Öztürk',
    email: 'sukru.ozturk@example.com',
    phone: '+90 555 123 4567',
    links: ['https://linkedin.com/in/sukruozturk'],
  },
  summary:
    'Çok dilli büyük ölçekli kurumsal yazılım sistemlerinde 8 yıl deneyimli Kıdemli Yazılım Mimarı.',
  experience: [
    {
      company: 'Özşeker Bilişim ve İletişim Sanayi A.Ş.',
      title: 'Kıdemli Çözüm Mimarı & Takım Lideri',
      startDate: '2020-04',
      endDate: '2024-08',
      description: 'Mikroservis dönüşüm sürecini yönetti',
      bullets: [
        'Türkçe doğal dil işleme (NLP) modellerini entegre etti',
        'Dağıtık önbellekleme ile çağrı gecikmelerini %60 düşürdü',
      ],
    },
  ],
  education: [
    {
      institution: 'Boğaziçi Üniversitesi',
      degree: 'Bilgisayar Mühendisliği Lisans Eğitimi',
      startDate: '2015-09',
      endDate: '2019-06',
    },
  ],
  skills: ['TypeScript', 'İleri Düzey SQL', 'Doğal Dil İşleme', 'Ağ Güvenliği', 'Docker'],
  projects: [
    {
      name: 'Gelişmiş Çağrı Dağıtım Sistemi',
      description: 'Yüksek hacimli müşteri iletişim merkezi çözümü',
      link: 'https://github.com/example/cagri-merkezi',
    },
  ],
};

describe('Adversarial Test Suite: LanguageSchema', () => {
  it('TC-ADV-LANG-01: accepts valid language options "en" and "tr"', () => {
    assert.equal(LanguageSchema.parse('en'), 'en');
    assert.equal(LanguageSchema.parse('tr'), 'tr');
  });

  it('TC-ADV-LANG-02: strictly rejects unsupported languages ("es", "de", "fr", "it", "ru", "zh", "ja")', () => {
    const invalidLangs = ['es', 'de', 'fr', 'it', 'ru', 'zh', 'ja', 'ar', 'pt'];
    for (const lang of invalidLangs) {
      assert.throws(
        () => LanguageSchema.parse(lang),
        /Invalid enum value/,
        `Expected rejection for unsupported language: ${lang}`
      );
    }
  });

  it('TC-ADV-LANG-03: rejects uppercase and mixed-case language codes ("EN", "TR", "En", "Tr")', () => {
    const caseVariants = ['EN', 'TR', 'En', 'Tr', 'eN', 'tR'];
    for (const variant of caseVariants) {
      assert.throws(
        () => LanguageSchema.parse(variant),
        /Invalid enum value/,
        `Expected rejection for case variant: ${variant}`
      );
    }
  });

  it('TC-ADV-LANG-04: rejects empty string ("")', () => {
    assert.throws(() => LanguageSchema.parse(''), /Invalid enum value/);
  });

  it('TC-ADV-LANG-05: rejects null and undefined', () => {
    assert.throws(() => LanguageSchema.parse(null));
    assert.throws(() => LanguageSchema.parse(undefined));
  });

  it('TC-ADV-LANG-06: rejects whitespace-padded language strings', () => {
    const padded = [' en', 'en ', ' tr', 'tr ', '  en  ', '\ten\n'];
    for (const val of padded) {
      assert.throws(() => LanguageSchema.parse(val), /Invalid enum value/);
    }
  });

  it('TC-ADV-LANG-07: rejects regional / subtag locale codes ("en-US", "tr-TR", "en_GB")', () => {
    const subtagCodes = ['en-US', 'en-GB', 'tr-TR', 'en_US', 'tr_TR'];
    for (const code of subtagCodes) {
      assert.throws(() => LanguageSchema.parse(code), /Invalid enum value/);
    }
  });

  it('TC-ADV-LANG-08: rejects 3-letter ISO 639-2 codes ("eng", "tur")', () => {
    assert.throws(() => LanguageSchema.parse('eng'), /Invalid enum value/);
    assert.throws(() => LanguageSchema.parse('tur'), /Invalid enum value/);
  });

  it('TC-ADV-LANG-09: rejects non-string types (number, boolean, object, array)', () => {
    assert.throws(() => LanguageSchema.parse(0));
    assert.throws(() => LanguageSchema.parse(1));
    assert.throws(() => LanguageSchema.parse(true));
    assert.throws(() => LanguageSchema.parse(false));
    assert.throws(() => LanguageSchema.parse({}));
    assert.throws(() => LanguageSchema.parse(['en']));
  });

  it('TC-ADV-LANG-10: rejects unicode homoglyphs (e.g. Cyrillic "еn")', () => {
    // \u0435 is Cyrillic small letter ie, looks identical to Latin 'e'
    const cyrillicEn = '\u0435n';
    assert.throws(() => LanguageSchema.parse(cyrillicEn), /Invalid enum value/);
  });

  it('TC-ADV-LANG-11: verifies SUPPORTED_LANGUAGES and DEFAULT_LANGUAGE constants', () => {
    assert.deepEqual([...SUPPORTED_LANGUAGES], ['en', 'tr']);
    assert.equal(DEFAULT_LANGUAGE, 'en');
  });
});

describe('Adversarial Test Suite: ExportFormatSchema & Export Requests', () => {
  it('TC-ADV-EXP-01: accepts valid export formats "pdf", "docx", and "tex"', () => {
    assert.equal(ExportFormatSchema.parse('pdf'), 'pdf');
    assert.equal(ExportFormatSchema.parse('docx'), 'docx');
    assert.equal(ExportFormatSchema.parse('tex'), 'tex');
  });

  it('TC-ADV-EXP-02: strictly rejects unsupported formats "txt", "html", "json"', () => {
    const rejectedFormats = ['txt', 'html', 'json'];
    for (const fmt of rejectedFormats) {
      assert.throws(
        () => ExportFormatSchema.parse(fmt),
        /Invalid enum value/,
        `Expected rejection for format: ${fmt}`
      );
    }
  });

  it('TC-ADV-EXP-03: rejects additional document formats ("rtf", "odt", "markdown", "md", "xml", "csv")', () => {
    const additional = ['rtf', 'odt', 'markdown', 'md', 'xml', 'csv', 'yaml', 'doc'];
    for (const fmt of additional) {
      assert.throws(
        () => ExportFormatSchema.parse(fmt),
        /Invalid enum value/,
        `Expected rejection for format: ${fmt}`
      );
    }
  });

  it('TC-ADV-EXP-04: rejects uppercase and mixed-case formats ("PDF", "DOCX", "TEX", "Pdf", "Docx", "Tex")', () => {
    const caseVariants = ['PDF', 'DOCX', 'TEX', 'Pdf', 'Docx', 'Tex', 'pDf'];
    for (const variant of caseVariants) {
      assert.throws(
        () => ExportFormatSchema.parse(variant),
        /Invalid enum value/,
        `Expected rejection for format: ${variant}`
      );
    }
  });

  it('TC-ADV-EXP-05: rejects empty string, null, undefined, and non-string types', () => {
    assert.throws(() => ExportFormatSchema.parse(''), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse(null));
    assert.throws(() => ExportFormatSchema.parse(undefined));
    assert.throws(() => ExportFormatSchema.parse(1));
    assert.throws(() => ExportFormatSchema.parse({ format: 'pdf' }));
  });

  it('TC-ADV-EXP-06: rejects extensions with leading dot (".pdf", ".docx", ".tex")', () => {
    assert.throws(() => ExportFormatSchema.parse('.pdf'), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse('.docx'), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse('.tex'), /Invalid enum value/);
  });

  it('TC-ADV-EXP-07: verifies EXPORT_FORMATS and EXPORT_MIME_TYPES mapping exhaustiveness', () => {
    assert.deepEqual([...EXPORT_FORMATS], ['pdf', 'docx', 'tex']);
    assert.equal(EXPORT_MIME_TYPES.pdf, 'application/pdf');
    assert.equal(
      EXPORT_MIME_TYPES.docx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    assert.equal(EXPORT_MIME_TYPES.tex, 'application/x-tex');
    assert.deepEqual(Object.keys(EXPORT_MIME_TYPES).sort(), ['docx', 'pdf', 'tex']);
  });

  it('TC-ADV-EXP-08: ExportResumeRequestSchema accepts valid requests for all 3 formats with default language', () => {
    for (const format of ['pdf', 'docx', 'tex'] as const) {
      const parsed = ExportResumeRequestSchema.parse({
        resumeData: baseEnResume,
        format,
      });
      assert.equal(parsed.format, format);
      assert.equal(parsed.language, 'en');
      assert.equal(parsed.template, 'standard');
    }
  });

  it('TC-ADV-EXP-09: ExportResumeRequestSchema accepts explicit Turkish language and custom template', () => {
    const parsed = ExportResumeRequestSchema.parse({
      resumeData: baseTrResume,
      format: 'pdf',
      language: 'tr',
      template: 'modern',
      filename: 'ozgecmis-sukru-ozturk.pdf',
    });
    assert.equal(parsed.language, 'tr');
    assert.equal(parsed.template, 'modern');
    assert.equal(parsed.filename, 'ozgecmis-sukru-ozturk.pdf');
  });

  it('TC-ADV-EXP-10: ExportResumeRequestSchema rejects invalid format ("txt", "html", "json")', () => {
    for (const badFormat of ['txt', 'html', 'json', 'rtf']) {
      assert.throws(
        () =>
          ExportResumeRequestSchema.parse({
            resumeData: baseEnResume,
            format: badFormat,
          }),
        /Invalid enum value/
      );
    }
  });

  it('TC-ADV-EXP-11: ExportResumeRequestSchema rejects invalid language ("de", "es", "EN")', () => {
    for (const badLang of ['de', 'es', 'EN', 'TR', '']) {
      assert.throws(
        () =>
          ExportResumeRequestSchema.parse({
            resumeData: baseEnResume,
            format: 'pdf',
            language: badLang,
          }),
        /Invalid enum value/
      );
    }
  });

  it('TC-ADV-EXP-12: ExportResumeRequestSchema rejects invalid template ("fancy", "creative")', () => {
    assert.throws(
      () =>
        ExportResumeRequestSchema.parse({
          resumeData: baseEnResume,
          format: 'pdf',
          template: 'fancy',
        }),
      /Invalid enum value/
    );
  });

  it('TC-ADV-EXP-13: ExportResumeResponseSchema validates complete response and rejects invalid formats', () => {
    const validResp = {
      success: true,
      format: 'pdf',
      language: 'tr',
      filename: 'resume.pdf',
      downloadUrl: '/api/download/resume.pdf',
      contentBase64: 'JVBERi0xLjQK...',
    };
    const parsed = ExportResumeResponseSchema.parse(validResp);
    assert.equal(parsed.success, true);
    assert.equal(parsed.format, 'pdf');
    assert.equal(parsed.language, 'tr');

    assert.throws(
      () => ExportResumeResponseSchema.parse({ ...validResp, format: 'txt' }),
      /Invalid enum value/
    );
    assert.throws(
      () => ExportResumeResponseSchema.parse({ ...validResp, language: 'fr' }),
      /Invalid enum value/
    );
  });
});

describe('Adversarial Test Suite: BilingualResumeSchema & Diacritics', () => {
  it('TC-ADV-BIL-01: accepts complete English + Turkish dual resume container', () => {
    const payload = {
      en: baseEnResume,
      tr: baseTrResume,
      activeLanguage: 'tr',
    };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.ok(parsed.en);
    assert.ok(parsed.tr);
    assert.equal(parsed.activeLanguage, 'tr');
    assert.equal(parsed.en?.contact.name, 'Jane Doe');
    assert.equal(parsed.tr?.contact.name, 'Şükrü Çağlar Öztürk');
  });

  it('TC-ADV-BIL-02: accepts English-only resume container with activeLanguage default', () => {
    const payload = {
      en: baseEnResume,
    };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.ok(parsed.en);
    assert.equal(parsed.tr, undefined);
    assert.equal(parsed.activeLanguage, 'en');
  });

  it('TC-ADV-BIL-03: accepts Turkish-only resume container with explicit activeLanguage "tr"', () => {
    const payload = {
      tr: baseTrResume,
      activeLanguage: 'tr',
    };
    const parsed = BilingualResumeSchema.parse(payload);
    assert.ok(parsed.tr);
    assert.equal(parsed.en, undefined);
    assert.equal(parsed.activeLanguage, 'tr');
  });

  it('TC-ADV-BIL-04: rejects empty container where neither en nor tr is provided', () => {
    assert.throws(
      () => BilingualResumeSchema.parse({}),
      /At least one language version \(en or tr\) must be provided/
    );
  });

  it('TC-ADV-BIL-05: rejects container where en and tr are explicitly undefined', () => {
    assert.throws(
      () => BilingualResumeSchema.parse({ en: undefined, tr: undefined }),
      /At least one language version \(en or tr\) must be provided/
    );
  });

  it('TC-ADV-BIL-06: rejects container with invalid activeLanguage ("de", "es", "TR", null)', () => {
    const invalidLangs = ['de', 'es', 'TR', 'EN', ''];
    for (const badLang of invalidLangs) {
      assert.throws(
        () =>
          BilingualResumeSchema.parse({
            en: baseEnResume,
            activeLanguage: badLang,
          }),
        /Invalid enum value/
      );
    }
  });

  it('TC-ADV-BIL-07: Turkish diacritics comprehensive stress-test (ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ö, Ş, Ü, â, î, û)', () => {
    const trDiacriticsText =
      'Şu bozuk çağda, ağır yük altında çalışan işçilerimiz; öğle molasında ' +
      'çiğ köfte, sütlü tatlılar ve taze incir yiyerek güç topladılar. ' +
      'İNCİR, ÇAĞLA, ÖRDEK, ŞEMSİYE, GÜNEŞ, IŞIK, KÂĞIT, RESMÎ, SÜKÛT.';

    const diacriticResume: ResumeStructure = {
      language: 'tr',
      contact: {
        name: 'Doç. Dr. İnci Şükran Gökçe-Öztürk',
        email: 'inci.gokce@example.com',
        phone: '+90 532 999 8877',
        links: ['https://örnek.com/özgeçmiş'],
      },
      summary: trDiacriticsText,
      experience: [
        {
          company: 'Çağdaş Çelik ve Ağır Sanayi Anonim Şirketi',
          title: 'Başmühendis & Ar-Ge Grup Müdürü',
          startDate: '2018-01',
          endDate: '2023-12',
          description:
            'Geliştirilen yüksek çözünürlüklü ölçüm cihazları ile üretim hattı verimliliği artırıldı.',
          bullets: [
            'Özgün şifreleme ve ağ güvenlik algoritmaları tasarlandı',
            'İleri düzey Türkçe ses tanıma ve doğal dil işleme modelleri entegre edildi',
            'Dağıtık veri işleme süreçlerinde gecikme süresi düşürüldü',
          ],
        },
      ],
      education: [
        {
          institution: 'Eskişehir Osmangazi Üniversitesi',
          degree: 'Bilgisayar Mühendisliği Bölümü Yüksek Lisans Programı',
          startDate: '2016-09',
          endDate: '2018-06',
        },
      ],
      skills: [
        'Doğal Dil İşleme',
        'Ağ Güvenliği',
        'Örüntü Tanıma',
        'İleri Düzey Veri Yapıları',
        'Yapay Zekâ',
        'Çok Kanallı İletişim',
      ],
      projects: [
        {
          name: 'Türkçe Doğal Dil Anlama Çatısı (T-NLU)',
          description: 'Türkçe eklemeli morfolojik yapıları çözen açık kaynaklı kütüphane',
          link: 'https://github.com/example/turkce-nlu',
        },
      ],
    };

    // Test ResumeStructureSchema parse directly
    const parsedStructure = ResumeStructureSchema.parse(diacriticResume);
    assert.equal(parsedStructure.contact.name, 'Doç. Dr. İnci Şükran Gökçe-Öztürk');
    assert.equal(parsedStructure.summary, trDiacriticsText);
    assert.equal(
      parsedStructure.experience[0].company,
      'Çağdaş Çelik ve Ağır Sanayi Anonim Şirketi'
    );
    assert.equal(
      parsedStructure.experience[0].title,
      'Başmühendis & Ar-Ge Grup Müdürü'
    );
    assert.equal(
      parsedStructure.experience[0].bullets[0],
      'Özgün şifreleme ve ağ güvenlik algoritmaları tasarlandı'
    );
    assert.equal(
      parsedStructure.skills[0],
      'Doğal Dil İşleme'
    );
    assert.equal(
      parsedStructure.skills[4],
      'Yapay Zekâ'
    );

    // Test BilingualResumeSchema wrapper
    const bilingualPayload = {
      en: baseEnResume,
      tr: diacriticResume,
      activeLanguage: 'tr' as const,
    };
    const parsedBilingual = BilingualResumeSchema.parse(bilingualPayload);
    assert.equal(parsedBilingual.tr?.contact.name, 'Doç. Dr. İnci Şükran Gökçe-Öztürk');
    assert.equal(parsedBilingual.tr?.summary, trDiacriticsText);

    // Verify all 12 Turkish diacritics are strictly intact without byte degradation
    const allDiacritics = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'İ', 'Ç', 'Ğ', 'Ö', 'Ş', 'Ü'];
    for (const char of allDiacritics) {
      assert.ok(
        parsedStructure.summary.includes(char),
        `Character ${char} was lost or corrupted in summary text`
      );
    }
  });

  it('TC-ADV-BIL-08: rejects deep validation errors inside nested resume structures', () => {
    // 1. Invalid email in English resume
    assert.throws(
      () =>
        BilingualResumeSchema.parse({
          en: {
            ...baseEnResume,
            contact: { ...baseEnResume.contact, email: 'not-an-email' },
          },
          tr: baseTrResume,
        }),
      /Invalid email address/
    );

    // 2. Missing company in Turkish experience
    assert.throws(
      () =>
        BilingualResumeSchema.parse({
          en: baseEnResume,
          tr: {
            ...baseTrResume,
            experience: [{ ...baseTrResume.experience[0], company: '' }],
          },
        }),
      /Company name is required/
    );

    // 3. Missing institution in Turkish education
    assert.throws(
      () =>
        BilingualResumeSchema.parse({
          en: baseEnResume,
          tr: {
            ...baseTrResume,
            education: [{ ...baseTrResume.education[0], institution: '' }],
          },
        }),
      /Institution is required/
    );
  });
});

describe('Adversarial Test Suite: Localized Section Titles', () => {
  it('TC-ADV-SEC-01: verifies DEFAULT_SECTION_TITLES for English', () => {
    const enTitles = DEFAULT_SECTION_TITLES.en;
    assert.equal(enTitles.contact, 'Contact Information');
    assert.equal(enTitles.summary, 'Professional Summary');
    assert.equal(enTitles.experience, 'Work Experience');
    assert.equal(enTitles.education, 'Education');
    assert.equal(enTitles.skills, 'Skills');
    assert.equal(enTitles.projects, 'Projects');
  });

  it('TC-ADV-SEC-02: verifies DEFAULT_SECTION_TITLES for Turkish contains expected diacritics', () => {
    const trTitles = DEFAULT_SECTION_TITLES.tr;
    assert.equal(trTitles.contact, 'İletişim Bilgileri');
    assert.equal(trTitles.summary, 'Profesyonel Özet');
    assert.equal(trTitles.experience, 'İş Deneyimi');
    assert.equal(trTitles.education, 'Eğitim');
    assert.equal(trTitles.skills, 'Yetenekler');
    assert.equal(trTitles.projects, 'Projeler');
  });

  it('TC-ADV-SEC-03: accepts custom localized section headers in ResumeStructureSchema', () => {
    const customSectionTitles = {
      contact: 'Kişisel ve İletişim Bilgileri',
      summary: 'Hakkımda & Kariyer Özeti',
      experience: 'Mesleki Geçmiş & Tecrübeler',
      education: 'Öğrenim Durumu & Akademik Geçmiş',
      skills: 'Teknik Yetkinlikler & Beceriler',
      projects: 'Kişisel ve Açık Kaynak Projeler',
    };

    const resumeWithCustomTitles = {
      ...baseTrResume,
      sectionTitles: customSectionTitles,
    };

    const parsed = ResumeStructureSchema.parse(resumeWithCustomTitles);
    assert.deepEqual(parsed.sectionTitles, customSectionTitles);
  });

  it('TC-ADV-SEC-04: accepts partial custom section headers', () => {
    const partialTitles = {
      experience: 'İş Hayatı ve Başarılar',
      skills: 'Uzmanlık Alanları',
    };

    const resume = {
      ...baseTrResume,
      sectionTitles: partialTitles,
    };

    const parsed = ResumeStructureSchema.parse(resume);
    assert.equal(parsed.sectionTitles?.experience, 'İş Hayatı ve Başarılar');
    assert.equal(parsed.sectionTitles?.skills, 'Uzmanlık Alanları');
    assert.equal(parsed.sectionTitles?.summary, undefined);
  });

  it('TC-ADV-SEC-05: accepts omitted (undefined) sectionTitles', () => {
    const resume = { ...baseEnResume, sectionTitles: undefined };
    const parsed = ResumeStructureSchema.parse(resume);
    assert.equal(parsed.sectionTitles, undefined);
  });

  it('TC-ADV-SEC-06: rejects non-string values for section headers', () => {
    assert.throws(
      () =>
        LocalizedSectionTitlesSchema.parse({
          experience: 12345,
        }),
      /Expected string, received number/
    );
    assert.throws(
      () =>
        LocalizedSectionTitlesSchema.parse({
          skills: true,
        }),
      /Expected string, received boolean/
    );
  });
});

describe('Adversarial Test Suite: Stress & Injection Edge Cases', () => {
  it('TC-ADV-STR-01: handles large scale data (50KB summary, 500 skills, 50 bullets) without memory/timeout issues', () => {
    const largeSummary = 'Büyük ölçekli veri analitiği. '.repeat(1500); // ~46KB
    const manySkills = Array.from({ length: 500 }, (_, i) => `Yetenek-${i}-Teknoloji`);
    const manyBullets = Array.from({ length: 50 }, (_, i) => `Başarı maddesi ${i}: Süreç optimize edildi.`);

    const heavyResume: ResumeStructure = {
      ...baseTrResume,
      summary: largeSummary,
      skills: manySkills,
      experience: [
        {
          ...baseTrResume.experience[0],
          bullets: manyBullets,
        },
      ],
    };

    const start = performance.now();
    const parsed = ResumeStructureSchema.parse(heavyResume);
    const duration = performance.now() - start;

    assert.equal(parsed.skills.length, 500);
    assert.equal(parsed.experience[0].bullets.length, 50);
    assert.equal(parsed.summary.length, largeSummary.length);
    assert.ok(duration < 200, `Parse time ${duration}ms exceeded 200ms threshold`);
  });

  it('TC-ADV-STR-02: preserves raw strings containing XSS vectors and HTML tags verbatim without crashing', () => {
    const xssPayload = '<script>alert("xss")</script><img src="x" onerror="stealCookie()">';
    const xssResume = {
      ...baseEnResume,
      summary: xssPayload,
      contact: {
        ...baseEnResume.contact,
        name: 'John <svg onload=alert(1)> Doe',
      },
      experience: [
        {
          ...baseEnResume.experience[0],
          bullets: ['<iframe src="evil.com"></iframe>', 'Normal bullet'],
        },
      ],
    };

    const parsed = ResumeStructureSchema.parse(xssResume);
    assert.equal(parsed.summary, xssPayload);
    assert.equal(parsed.contact.name, 'John <svg onload=alert(1)> Doe');
    assert.equal(parsed.experience[0].bullets[0], '<iframe src="evil.com"></iframe>');
  });

  it('TC-ADV-STR-03: preserves LaTeX control characters and escape sequences in resume fields', () => {
    const latexPayload =
      '\\section*{Custom} \\textbf{Bold} & % $ # _ { } ~ ^ \\ \\input{/etc/passwd}';
    const latexResume = {
      ...baseEnResume,
      summary: latexPayload,
      skills: ['C++', 'LaTeX & TeX', 'R & D'],
    };

    const parsed = ResumeStructureSchema.parse(latexResume);
    assert.equal(parsed.summary, latexPayload);
    assert.equal(parsed.skills[1], 'LaTeX & TeX');
  });

  it('TC-ADV-STR-04: preserves null byte and unicode control characters without crashing', () => {
    const nullByteString = 'Text with null \u0000 byte and \u200B zero-width space.';
    const resume = {
      ...baseEnResume,
      summary: nullByteString,
    };
    const parsed = ResumeStructureSchema.parse(resume);
    assert.equal(parsed.summary, nullByteString);
  });

  it('TC-ADV-STR-05: prototype pollution attack payload does not pollute Object prototype', () => {
    const maliciousJson = JSON.parse(
      '{"__proto__": {"polluted": "yes"}, "language": "en", "contact": {"name": "Test", "email": "test@example.com"}}'
    );
    const parsed = ResumeStructureSchema.parse(maliciousJson);
    assert.equal(parsed.contact.name, 'Test');
    assert.equal((Object.prototype as any).polluted, undefined);
  });
});
