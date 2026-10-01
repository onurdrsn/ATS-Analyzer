import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage,
  extractJobRequirementsHeuristic,
  extractExperienceYears,
  extractDegreeRequirement,
  extractLanguageRequirements,
  extractSeniorityLevel,
  SOFT_SKILLS_DICTIONARY,
  HARD_SKILLS_DICTIONARY,
  TECH_SKILLS_DICTIONARY,
} from '../src/lib/heuristics.js';

describe('EMPIRICAL CHALLENGER (m2_it2_chal_1): Adversarial Challenge Suite', () => {

  describe('Mission 1: Turkish Dotted İ and Lowercase i Parsing', () => {
    it('1.1: Upper-case Turkish text with dotted İ extracts tech/soft/hard skills in extractJobRequirementsHeuristic', () => {
      const jd = `
İŞ TANIMI:
KIDEMLİ YAZILIM MÜHENDİSİ
GEREKSİNİMLER:
- MİKROSERVİS MİMARİSİ VE BULUT BİLİŞİM ALTYAPISI
- RESTFUL APİ TASARIMI
- ETKİLİ İLETİŞİM VE TAKIM ÇALIŞMASI
- GİT, LİNUX VE REDİS
`;
      const res = extractJobRequirementsHeuristic(jd, 'tr');

      assert.ok(res.hard_skills.includes('Mikroservis Mimarisi'), 'Captures Mikroservis Mimarisi');
      assert.ok(res.hard_skills.includes('Bulut Bilişim ve Altyapı'), 'Captures Bulut Bilişim ve Altyapı');
      assert.ok(res.soft_skills.includes('Etkili İletişim'), 'Captures Etkili İletişim');
      assert.ok(res.soft_skills.includes('Takım Çalışması'), 'Captures Takım Çalışması');
      assert.ok(res.tech_skills.includes('Git'), 'Captures Git');
      assert.ok(res.tech_skills.includes('Linux'), 'Captures Linux');
      assert.ok(res.tech_skills.includes('Redis'), 'Captures Redis');
    });

    it('1.2: Upper-case Turkish text with dotted İ in extractExperienceYears', () => {
      // In Turkish uppercase, DENEYİM and İŞ contain dotted uppercase İ (U+0130).
      // JavaScript regex /deneyim/i does NOT match "DENEYİM" unless text is normalized with tr-TR locale.
      const exp1 = extractExperienceYears('DENEYİM: 5 YIL');
      const exp2 = extractExperienceYears('5 YIL İŞ DENEYİMİ');
      const exp3 = extractExperienceYears('5 YIL İŞ TECRÜBESİ');

      console.log('[EMPIRICAL RESULT] extractExperienceYears("DENEYİM: 5 YIL"):', exp1);
      console.log('[EMPIRICAL RESULT] extractExperienceYears("5 YIL İŞ DENEYİMİ"):', exp2);
      console.log('[EMPIRICAL RESULT] extractExperienceYears("5 YIL İŞ TECRÜBESİ"):', exp3);

      // Document whether uppercase Turkish with dotted İ is extracted:
      assert.strictEqual(exp1, 5, 'DENEYİM: 5 YIL should extract 5 years');
      assert.strictEqual(exp2, 5, '5 YIL İŞ DENEYİMİ should extract 5 years');
      assert.strictEqual(exp3, 5, '5 YIL İŞ TECRÜBESİ should extract 5 years');
    });

    it('1.3: Turkish dotted İ in extractLanguageRequirements', () => {
      // In Turkish, "İngilizce" and "İNGİLİZCE" start with U+0130.
      // ASCII \b and /ingilizce/i fail to match U+0130 without tr-TR lowercasing.
      const langTr1 = extractLanguageRequirements('İNGİLİZCE ve ALMANCA bilen');
      const langTr2 = extractLanguageRequirements('İSPANYOLCA akıcı konuşabilen');

      console.log('[EMPIRICAL RESULT] extractLanguageRequirements("İNGİLİZCE ve ALMANCA bilen"):', langTr1);
      console.log('[EMPIRICAL RESULT] extractLanguageRequirements("İSPANYOLCA akıcı konuşabilen"):', langTr2);

      assert.ok(langTr1.includes('English'), 'Should detect English from İNGİLİZCE');
      assert.ok(langTr1.includes('German'), 'Should detect German from ALMANCA');
      assert.ok(langTr2.includes('Spanish'), 'Should detect Spanish from İSPANYOLCA');
    });
  });

  describe('Mission 2: Non-ASCII Word Boundaries in Turkish Texts (ç, ğ, ı, ö, ş, ü, İ)', () => {
    it('2.1: Non-ASCII boundaries match correctly on Turkish characters', () => {
      // takım çalışması ending with dotless ı
      const s1 = SOFT_SKILLS_DICTIONARY.find(s => s.nameEn === 'Teamwork & Collaboration')!;
      assert.ok(s1.pattern.test('Takım çalışması önemlidir'), 'Matches takım çalışması');

      // çözüm odaklı ending with dotless ı
      const s2 = SOFT_SKILLS_DICTIONARY.find(s => s.nameEn === 'Problem Solving')!;
      assert.ok(s2.pattern.test('Adayın çözüm odaklı olması beklenmektedir'), 'Matches çözüm odaklı');

      // sorumluluk bilinci ending with dotless i
      const s3 = SOFT_SKILLS_DICTIONARY.find(s => s.nameEn === 'Responsibility & Ownership')!;
      assert.ok(s3.pattern.test('Yüksek sorumluluk bilinci sahibi'), 'Matches sorumluluk bilinci');
    });

    it('2.2: Hard skills with Turkish diacritics match correctly', () => {
      const h1 = HARD_SKILLS_DICTIONARY.find(s => s.nameEn === 'Microservices Architecture')!;
      assert.ok(h1.pattern.test('dağıtık sistemler konusunda tecrübeli'), 'dağıtık sistemler matches');

      const h2 = HARD_SKILLS_DICTIONARY.find(s => s.nameEn === 'Database Architecture & Modeling')!;
      assert.ok(h2.pattern.test('ilişkisel veritabanı tasarımı yapabilen'), 'ilişkisel veritabanı matches');
    });

    it('2.3: Tech skills with sentence-ending punctuation (.) are matched correctly', () => {
      const res = extractJobRequirementsHeuristic('Backend C#. İkincil dil Go. Altyapı .NET. Versiyon Git.', 'en');
      assert.ok(res.tech_skills.includes('C#'), 'C#. matched');
      assert.ok(res.tech_skills.includes('Go'), 'Go. matched');
      assert.ok(res.tech_skills.includes('.NET'), '.NET. matched');
      assert.ok(res.tech_skills.includes('Git'), 'Git. matched');
    });

    it('2.4: Substring isolation prevents false-positive matches on Turkish words', () => {
      const gitDef = TECH_SKILLS_DICTIONARY.find(s => s.name === 'Git')!;
      assert.strictEqual(gitDef.pattern.test('eğitim süreci'), false, 'eğitim does not match Git');
      assert.strictEqual(gitDef.pattern.test('Adayın adı Yiğit'), false, 'Yiğit does not match Git');

      const goDef = TECH_SKILLS_DICTIONARY.find(s => s.name === 'Go')!;
      assert.strictEqual(goDef.pattern.test('teknik jargon kullanımı'), false, 'jargon does not match Go');
      assert.strictEqual(goDef.pattern.test('kategori yönetimi'), false, 'kategori does not match Go');
    });
  });

  describe('Mission 3: Degree Level Precedence & Spellings', () => {
    it('3.1: Two-word "ön lisans" and abbreviations are classified as Associate Degree', () => {
      assert.strictEqual(
        extractDegreeRequirement('Ön lisans mezunu adaylar', 'tr'),
        'Ön Lisans (Associate Degree)',
        'Ön lisans matches Associate Degree'
      );
      assert.strictEqual(
        extractDegreeRequirement('MYO mezunu adaylar', 'tr'),
        'Ön Lisans (Associate Degree)',
        'MYO matches Associate Degree'
      );
      assert.strictEqual(
        extractDegreeRequirement('meslek yüksek okulu mezunu', 'tr'),
        'Ön Lisans (Associate Degree)',
        'meslek yüksek okulu matches Associate Degree'
      );
    });

    it('3.2: Single-word "önlisans" (TDK standard) is classified as Associate Degree', () => {
      const singleWord1 = extractDegreeRequirement('Üniversitelerin önlisans bölümlerinden mezun', 'tr');
      const singleWord2 = extractDegreeRequirement('ÖNLİSANS MEZUNU', 'tr');

      console.log('[EMPIRICAL RESULT] extractDegreeRequirement("önlisans bölümlerinden mezun"):', singleWord1);
      console.log('[EMPIRICAL RESULT] extractDegreeRequirement("ÖNLİSANS MEZUNU"):', singleWord2);

      assert.strictEqual(singleWord1, 'Ön Lisans (Associate Degree)', 'önlisans must be classified as Associate Degree');
      assert.strictEqual(singleWord2, 'Ön Lisans (Associate Degree)', 'ÖNLİSANS must be classified as Associate Degree');
    });

    it('3.3: Precedence when both "önlisans" and "lisans" appear in same text', () => {
      // In Turkish postings: "Üniversitelerin önlisans veya lisans bölümlerinden mezun"
      // If "önlisans" fails to match, it falls through to "lisans" and misclassifies as Bachelor's.
      const mixed = extractDegreeRequirement('Üniversitelerin önlisans veya lisans bölümlerinden mezun', 'tr');
      console.log('[EMPIRICAL RESULT] extractDegreeRequirement("önlisans veya lisans"):', mixed);

      assert.strictEqual(mixed, 'Ön Lisans (Associate Degree)', 'Must prioritize associate degree when önlisans is an option');
    });

    it('3.4: Compound word "meslek yüksekokulu" without space is classified as Associate Degree', () => {
      // In Turkish, "yüksekokul" is compound and written as one word.
      const myoCompound = extractDegreeRequirement('Meslek Yüksekokulu mezunu', 'tr');
      const myoCaps = extractDegreeRequirement('MESLEK YÜKSEKOKULU MEZUNU', 'tr');

      console.log('[EMPIRICAL RESULT] extractDegreeRequirement("Meslek Yüksekokulu mezunu"):', myoCompound);
      console.log('[EMPIRICAL RESULT] extractDegreeRequirement("MESLEK YÜKSEKOKULU MEZUNU"):', myoCaps);

      assert.strictEqual(myoCompound, 'Ön Lisans (Associate Degree)', 'Meslek Yüksekokulu must be classified as Associate Degree');
      assert.strictEqual(myoCaps, 'Ön Lisans (Associate Degree)', 'MESLEK YÜKSEKOKULU must be classified as Associate Degree');
    });
  });

  describe('Mission 4: Experience Year Extraction Diverse Formats', () => {
    it('4.1: Standard Turkish and English experience patterns extract numbers correctly', () => {
      assert.strictEqual(extractExperienceYears('en az 3 yıllık tecrübe'), 3, 'en az 3 yıllık tecrübe -> 3');
      assert.strictEqual(extractExperienceYears('3-5 sene tecrübe'), 3, '3-5 sene -> 3');
      assert.strictEqual(extractExperienceYears('minimum 2 yıl deneyim'), 2, 'minimum 2 yıl -> 2');
      assert.strictEqual(extractExperienceYears('5 years of experience'), 5, '5 years of experience -> 5');
    });

    it('4.2: Range format with words ("ila" in Turkish and "to" in English)', () => {
      // Due to regex character class bug: [-–—ila] and [-–—to]
      // "3 to 5 years" fails because [to] only matches 't' or 'o'.
      // "3 ila 5 yıl tecrübe" fails because [ila] only matches 'i', 'l', or 'a'.
      const trRangeWord = extractExperienceYears('3 ila 5 yıl tecrübe');
      const enRangeWord = extractExperienceYears('3 to 5 years of experience');

      console.log('[EMPIRICAL RESULT] extractExperienceYears("3 ila 5 yıl tecrübe"):', trRangeWord);
      console.log('[EMPIRICAL RESULT] extractExperienceYears("3 to 5 years of experience"):', enRangeWord);

      assert.strictEqual(trRangeWord, 3, '3 ila 5 yıl tecrübe should extract minimum 3 years');
      assert.strictEqual(enRangeWord, 3, '3 to 5 years of experience should extract minimum 3 years');
    });

    it('4.3: Standalone duration without trailing tecrübe/experience keyword ("5 yıl", "5+ years")', () => {
      // Job descriptions or resume bullet points frequently state "5 yıl" or "5+ years"
      const expTrStandalone = extractExperienceYears('En az 5 yıl');
      const expEnStandalone = extractExperienceYears('At least 5+ years');
      const expTrDirect = extractExperienceYears('5 yıl');
      const expEnDirect = extractExperienceYears('5+ years');

      console.log('[EMPIRICAL RESULT] extractExperienceYears("En az 5 yıl"):', expTrStandalone);
      console.log('[EMPIRICAL RESULT] extractExperienceYears("At least 5+ years"):', expEnStandalone);
      console.log('[EMPIRICAL RESULT] extractExperienceYears("5 yıl"):', expTrDirect);
      console.log('[EMPIRICAL RESULT] extractExperienceYears("5+ years"):', expEnDirect);

      assert.strictEqual(expTrStandalone, 5, '"En az 5 yıl" should extract 5');
      assert.strictEqual(expEnStandalone, 5, '"At least 5+ years" should extract 5');
      assert.strictEqual(expTrDirect, 5, '"5 yıl" should extract 5');
      assert.strictEqual(expEnDirect, 5, '"5+ years" should extract 5');
    });
  });
});
