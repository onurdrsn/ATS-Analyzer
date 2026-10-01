import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage,
  extractJobRequirementsHeuristic,
  extractExperienceYears,
  extractDegreeRequirement,
  extractSeniorityLevel,
  TECH_SKILLS_DICTIONARY,
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
} from '../src/lib/heuristics.js';
import { suggestRewrite } from '../src/lib/ai.js';
import app from '../src/index.js';

describe('EMPIRICAL CHALLENGER: Milestone 2 Bilingual Extraction & Heuristics Stress Suite', () => {

  describe('1. Turkish Diacritics and Mixed Casing Stress Tests', () => {
    it('REMEDIATED: Upper-case Turkish text with dotted İ and dotless I recognizes skills and seniority', () => {
      // Real-world Kariyer.net postings often use ALL CAPS or uppercase headings for requirements
      const upperJobPosting = `
GENEL NİTELİKLER VE İŞ TANIMI
KIDEMLİ YAZILIM MÜHENDİSİ
ADAY KRİTERLERİ:
- MİKROSERVİS MİMARİSİ VE BULUT BİLİŞİM DENEYİMİ
- RESTFUL APİ TASARIMI
- BİRİM TEST VE KOD İNCELEME
- TAKIM ÇALIŞMASI VE ETKİLİ İLETİŞİM
- ANALİTİK DÜŞÜNME VE PROBLEM ÇÖZME
- GİT, LİNUX VE REDİS
`;
      const extracted = extractJobRequirementsHeuristic(upperJobPosting, 'tr');

      // Check how many skills were actually captured:
      const missedHard = [];
      if (!extracted.hard_skills.includes('Mikroservis Mimarisi')) missedHard.push('Mikroservis Mimarisi');
      if (!extracted.hard_skills.includes('Bulut Bilişim ve Altyapı')) missedHard.push('Bulut Bilişim ve Altyapı');
      if (!extracted.hard_skills.includes('RESTful API Tasarımı')) missedHard.push('RESTful API Tasarımı');

      const missedSoft = [];
      if (!extracted.soft_skills.includes('Takım Çalışması')) missedSoft.push('Takım Çalışması');
      if (!extracted.soft_skills.includes('Etkili İletişim')) missedSoft.push('Etkili İletişim');
      if (!extracted.soft_skills.includes('Analitik Düşünme')) missedSoft.push('Analitik Düşünme');

      const missedTech = [];
      if (!extracted.tech_skills.includes('Git')) missedTech.push('Git');
      if (!extracted.tech_skills.includes('Linux')) missedTech.push('Linux');
      if (!extracted.tech_skills.includes('Redis')) missedTech.push('Redis');

      console.log('[EMPIRICAL RESULT] Upper-case Turkish missed hard skills:', missedHard);
      console.log('[EMPIRICAL RESULT] Upper-case Turkish missed soft skills:', missedSoft);
      console.log('[EMPIRICAL RESULT] Upper-case Turkish missed tech skills:', missedTech);
      console.log('[EMPIRICAL RESULT] Extracted Seniority for KIDEMLİ:', extracted.seniority_level);

      // Verify the remediation succeeds:
      assert.strictEqual(extracted.seniority_level, 'Senior', 'KIDEMLİ correctly matches Senior');
      assert.strictEqual(missedHard.length, 0, 'Expected hard skills to be captured in uppercase Turkish');
      assert.strictEqual(missedSoft.length, 0, 'Expected soft skills to be captured in uppercase Turkish');
      assert.strictEqual(missedTech.length, 0, 'Expected tech skills with I/İ to be captured in uppercase Turkish');
    });

    it('REMEDIATED: JavaScript word boundary matches non-ASCII Turkish characters at word boundaries', () => {
      // Test takım çalışması ending with dotless ı
      const phrase1 = 'Güçlü takım çalışması gerekmektedir';
      const teamworkPattern = SOFT_SKILLS_DICTIONARY.find(s => s.nameEn === 'Teamwork & Collaboration')!.pattern;
      const matchTeamwork = teamworkPattern.test(phrase1);
      console.log('[EMPIRICAL RESULT] "takım çalışması" followed by space matched:', matchTeamwork);
      assert.strictEqual(matchTeamwork, true, 'Matches after Turkish ı');

      // Test çözüm odaklı ending with dotless ı
      const phrase2 = 'Adayların çözüm odaklı olması beklenir';
      const problemPattern = SOFT_SKILLS_DICTIONARY.find(s => s.nameEn === 'Problem Solving')!.pattern;
      const matchProblem = problemPattern.test(phrase2);
      console.log('[EMPIRICAL RESULT] "çözüm odaklı" followed by space matched:', matchProblem);
      assert.strictEqual(matchProblem, true, 'Matches after Turkish ı in çözüm odaklı');

      // Test üniversite starting with ü
      const phrase3 = 'Üniversite mezunu olmak';
      const degreeMatch = extractDegreeRequirement(phrase3, 'tr');
      console.log('[EMPIRICAL RESULT] "Üniversite mezunu olmak" degree requirement:', degreeMatch);
      assert.strictEqual(degreeMatch, 'Üniversitelerin Lisans Bölümlerinden Mezun', 'Matches before Turkish Ü');
    });

    it('REMEDIATED: Degree Precedence Order (Ön Lisans correctly classified as Associate Degree)', () => {
      const associateJob = 'Aday Kriterleri: MYO veya Ön Lisans mezunu adaylar';
      const extractedDegree = extractDegreeRequirement(associateJob, 'tr');

      console.log('[EMPIRICAL RESULT] Ön Lisans degree extracted:', extractedDegree);
      assert.strictEqual(
        extractedDegree,
        'Ön Lisans (Associate Degree)',
        'Ön Lisans correctly classified as Associate Degree before Lisans'
      );
    });
  });

  describe('2. Sentence Trailing Punctuation on Tech Skills', () => {
    it('REMEDIATED: Tech skills ending with period (.) are detected properly', () => {
      const text1 = 'Temel geliştirme dili C#. İkincil dil C++.';
      const text2 = 'Backend framework .NET. Diller Go. Versiyon kontrol Git.';

      const extracted1 = extractJobRequirementsHeuristic(text1, 'en');
      const extracted2 = extractJobRequirementsHeuristic(text2, 'en');

      console.log('[EMPIRICAL RESULT] text1 tech skills (C#., C++.):', extracted1.tech_skills);
      console.log('[EMPIRICAL RESULT] text2 tech skills (.NET., Go., Git.):', extracted2.tech_skills);

      assert.strictEqual(extracted1.tech_skills.includes('C#'), true, 'C#. detected with trailing period');
      assert.strictEqual(extracted1.tech_skills.includes('C++'), true, 'C++. detected with trailing period');
      assert.strictEqual(extracted2.tech_skills.includes('.NET'), true, '.NET. detected with trailing period');
      assert.strictEqual(extracted2.tech_skills.includes('Go'), true, 'Go. detected with trailing period');
      assert.strictEqual(extracted2.tech_skills.includes('Git'), true, 'Git. detected with trailing period');
    });
  });

  describe('3. Experience and Seniority Extraction Quirks', () => {
    it('REMEDIATED: Senior Software Engineer reporting to Manager is classified as Senior', () => {
      const jd = `
Job Title: Senior Software Engineer
About the Role:
We are looking for a Senior Software Engineer to design high-throughput distributed systems.
Responsibilities:
- Build resilient backend microservices
- Collaborate closely with the Product Manager and Engineering Manager on roadmap
Qualifications:
- 5+ years of experience
`;
      const seniority = extractSeniorityLevel(jd);
      console.log('[EMPIRICAL RESULT] Senior Engineer reporting to Manager classified as:', seniority);
      assert.strictEqual(seniority, 'Senior', 'Senior IC collaborating with Manager is classified as Senior');
    });

    it('REMEDIATED: "Experience: 5+ years" and Turkish "Deneyim: 3 Yıl" extract numbers properly', () => {
      const enJd = 'Role: Software Engineer\nEducation: BS\nExperience: 5+ years in backend';
      const trJd = 'Pozisyon: Yazılım Mühendisi\nDeneyim: 3 Yıl\nEğitim: Lisans';

      const enExp = extractExperienceYears(enJd);
      const trExp = extractExperienceYears(trJd);

      console.log('[EMPIRICAL RESULT] English "Experience: 5+ years" extracted:', enExp);
      console.log('[EMPIRICAL RESULT] Turkish "Deneyim: 3 Yıl" extracted:', trExp);

      assert.strictEqual(enExp, 5, 'Experience: 5+ years is extracted as 5');
      assert.strictEqual(trExp, 3, 'Deneyim: 3 Yıl is extracted as 3');
    });
  });

  describe('4. Edge Cases: Foreign Languages, Whitespace, Bullet Rewrites', () => {
    it('REMEDIATED: German text with umlauts is correctly detected as English (non-Turkish)', () => {
      const germanText = 'Wir suchen einen Entwickler für schöne und innovative Lösungen.';
      const detected = detectLanguage(germanText);
      console.log('[EMPIRICAL RESULT] German text with umlauts detected as:', detected);
      assert.strictEqual(detected, 'en', 'German umlauts do not false-positive as Turkish');
    });

    it('REMEDIATED: /api/rewrite-bullet rejects whitespace-only strings with 400 Bad Request', async () => {
      const req = new Request('http://localhost:3000/api/rewrite-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalBullet: '   ',
          missingSkill: '   ',
          language: 'en',
        }),
      });

      const res = await app.fetch(req);
      const data: any = await res.json();
      console.log('[EMPIRICAL RESULT] Whitespace bullet rewrite response:', res.status, data);

      assert.strictEqual(res.status, 400, 'Whitespace-only bullet is rejected with 400');
      assert.strictEqual(data.error, 'Original bullet and missing skill are required.');
    });

    it('CHALLENGE: Bullet rewrite template formatting fallback', async () => {
      const trSuggestion = await suggestRewrite({ AI: null }, 'Mikroservis sistemleri geliştirdim', 'Docker', 'tr');
      const enSuggestion = await suggestRewrite({ AI: null }, 'Built backend systems', 'Docker', 'en');

      console.log('[EMPIRICAL RESULT] Turkish rewrite fallback:', trSuggestion);
      console.log('[EMPIRICAL RESULT] English rewrite fallback:', enSuggestion);

      assert.ok(trSuggestion.includes('Docker'));
      assert.ok(enSuggestion.includes('Docker'));
    });
  });
});
