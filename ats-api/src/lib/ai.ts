import type { ExtractedJobRequirements } from '@ats-analyzer/contracts';
import { extractJobRequirementsHeuristic, detectLanguage } from './heuristics.js';
export * from './heuristics.js';

export interface AIEnv {
  AI: any; // Binding for Workers AI
}

export function sanitizeExtractedRequirements(data: any): ExtractedJobRequirements {
  return {
    hard_skills: Array.isArray(data?.hard_skills) ? data.hard_skills.filter((s: any) => typeof s === 'string') : [],
    soft_skills: Array.isArray(data?.soft_skills) ? data.soft_skills.filter((s: any) => typeof s === 'string') : [],
    tech_skills: Array.isArray(data?.tech_skills) ? data.tech_skills.filter((s: any) => typeof s === 'string') : [],
    years_experience_required: typeof data?.years_experience_required === 'number' ? data.years_experience_required : null,
    degree_requirement: typeof data?.degree_requirement === 'string' ? data.degree_requirement : null,
    language_requirements: Array.isArray(data?.language_requirements) ? data.language_requirements.filter((s: any) => typeof s === 'string') : ['English'],
    seniority_level: typeof data?.seniority_level === 'string' ? data.seniority_level : 'Mid-Level',
  };
}

export function parseAIJSON(raw: string, fallback: ExtractedJobRequirements): ExtractedJobRequirements {
  if (!raw) return fallback;
  let cleaned = raw.trim();

  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(cleaned);
    return sanitizeExtractedRequirements(parsed);
  } catch (err) {
    console.warn('[AI] JSON parse failed, utilizing heuristic fallback', err);
    return fallback;
  }
}

export async function extractSkills(
  env: AIEnv,
  text: string,
  language: 'en' | 'tr' = 'en'
): Promise<ExtractedJobRequirements> {
  const fallback = extractJobRequirementsHeuristic(text, language);

  if (!env || !env.AI) {
    return fallback;
  }

  const prompt = language === 'tr'
    ? `Aşağıdaki iş ilanından yapılandırılmış aday gereksinimlerini çıkar.
Kariyer.net veya LinkedIn ilanlarındaki "GENEL NİTELİKLER", "İŞ TANIMI", "ADAY KRİTERLERİ" bölümlerini dikkatle analiz et.

Yalnızca ve kesinlikle geçerli bir JSON döndür. Açıklama metni ekleme.
Şema:
{
  "hard_skills": string[], // Metodoloji ve uzmanlıklar (örn: "Mikroservis Mimarisi", "RESTful API Tasarımı", "İlişkisel Veritabanı Modelleme", "Birim Test (Unit Testing)", "CI/CD Süreçleri")
  "soft_skills": string[], // Kişisel yetkinlikler (örn: "Problem Çözme", "Takım Çalışması", "Analitik Düşünme", "Etkili İletişim", "Zaman Yönetimi")
  "tech_skills": string[], // Standart isimleriyle araç ve diller (örn: "React", "TypeScript", "Node.js", "Docker", "PostgreSQL", "AWS", "Git")
  "years_experience_required": number | null, // Asgari tecrübe yılı (örn: "en az 3 yıl" -> 3, "3-5 yıl" -> 3, belirtilmemişse null)
  "degree_requirement": string | null, // Eğitim seviyesi (örn: "Üniversitelerin Lisans Bölümlerinden Mezun", belirtilmemişse null)
  "language_requirements": string[], // Yabancı dil şartları (örn: ["İngilizce"])
  "seniority_level": string // "Intern", "Junior", "Mid-Level", "Senior", "Lead", "Manager"
}

İş İlanı:
"""
${text}
"""`
    : `You are extracting structured requirements from a job posting.
Return strict JSON with keys: hard_skills[], soft_skills[], tech_skills[], years_experience_required (number|null), degree_requirement (string|null), language_requirements[], seniority_level (string).
Do not infer skills that are not explicitly stated or clearly implied. Standardize tech skill names.

Job posting:
"""
${text}
"""`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: language === 'tr' ? 'Hassas bir JSON veri çıkarıcısısın. Yalnızca geçerli JSON üret.' : 'You are a precise JSON extractor. Only output valid JSON.' },
        { role: 'user', content: prompt }
      ]
    });

    return parseAIJSON(response.response, fallback);
  } catch (err) {
    console.error('[AI] Workers AI extraction call failed:', err);
    return fallback;
  }
}

export async function suggestRewrite(
  env: AIEnv,
  originalBullet: string,
  missingSkill: string,
  language: 'en' | 'tr' = 'en'
): Promise<string> {
  const fallback = language === 'tr'
    ? `${originalBullet} (süreç verimliliğini artırmak amacıyla ${missingSkill} yetkinliği etkin şekilde uygulanmıştır)`
    : `${originalBullet} (leveraging ${missingSkill} for enhanced workflow efficiency)`;

  if (!env || !env.AI) {
    return fallback;
  }

  const systemContent = language === 'tr'
    ? 'Sen deneyimli bir teknik özgeçmiş ve insan kaynakları uzmanısın. Adayın sahip olmadığı deneyimleri asla uydurma. Sadece Türkçe yanıt ver.'
    : 'You are an expert resume writer. Do not invent experience. Output in English only.';

  const prompt = language === 'tr'
    ? `Aşağıdaki özgeçmiş madde işaretini, yalnızca orijinal bağlamla doğal ve mantıklı bir bağlantısı varsa "${missingSkill}" yetkinliğini öne çıkaracak şekilde TÜRKÇE olarak yeniden yaz. Orijinal madde tamamen ilgisizse "${missingSkill}" yetkinliğini uydurarak ekleme. İfadeyi profesyonel, eylem odaklı ve ATS uyumlu tut. Yanıtında SADECE yeniden yazılmış madde metnini döndür, fazladan açıklama veya tırnak işareti ekleme.

Orijinal Madde: "${originalBullet}"`
    : `Rewrite the following resume bullet point to better highlight the skill "${missingSkill}", but only if it's naturally related to the original context. DO NOT fabricate or insert "${missingSkill}" if the original bullet is completely unrelated. Keep it professional and ATS-friendly. Output ONLY the rewritten bullet.

Original: "${originalBullet}"`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-awq', {
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ]
    });

    return response.response.trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('[AI] Workers AI rewrite call failed:', err);
    return fallback;
  }
}
