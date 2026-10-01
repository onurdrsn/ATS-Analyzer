import type { ExtractedJobRequirements } from '@ats-analyzer/contracts';

// Unicode-aware word boundary delimiters
export const wbStart = '(?:^|[\\s,.:;()/"\'\\[\\]\\-]|\\b)';
export const wbEnd = '(?:[\\s,.:;()/"\'\\[\\]\\-]|\\b|$)';

// --- LANGUAGE DETECTION ---
export function detectLanguage(text: string): 'en' | 'tr' {
  if (!text || text.trim().length === 0) return 'en';

  // Distinct Turkish Unicode characters not present in German/English
  const trSpecificChars = (text.match(/[çÇğĞıİşŞ]/g) || []).length;
  // Characters that may be shared with other languages (German ä/ö/ü)
  const trSharedChars = (text.match(/[öÖüÜ]/g) || []).length;

  // High-frequency Turkish job posting markers
  const trKeywords = [
    'genel nitelikler', 'iş tanımı', 'is tanimi', 'aday kriterleri', 'pozisyon bilgileri',
    'aranan nitelikler', 'tecrübe', 'tecrübeli', 'tecrube', 'deneyim', 'deneyimli',
    'mezun', 'mezunu', 'üniversite', 'universite', 'lisans', 'yüksek lisans', 'ön lisans',
    'askerlik', 'muaf', 'tecilli', 'çalışma', 'calisma', 'takım çalışması',
    'hakim', 'yetkinlik', 'tercihen', 'şirket', 'sorumluluk', 'görev',
    ' ve ', ' ile ', ' için ', 'icin ', ' olan ', ' olarak ', ' adayların ', ' aranmaktadır '
  ];
  let trKeywordScore = 0;
  const lowerText = text.toLocaleLowerCase('tr-TR');
  for (const kw of trKeywords) {
    if (lowerText.includes(kw)) trKeywordScore += 2;
  }

  // High-frequency English job posting markers
  const enKeywords = [
    'qualifications', 'requirements', 'responsibilities', 'job description',
    'experience', 'years of experience', 'bachelor', 'degree', 'preferred',
    'skills', 'teamwork', 'communication', 'full-time', 'reporting to',
    'must have', 'nice to have', 'looking for',
    ' and ', ' with ', ' for ', ' the ', ' in ', ' of ', ' to '
  ];
  let enKeywordScore = 0;
  const lowerEn = text.toLowerCase();
  for (const kw of enKeywords) {
    if (lowerEn.includes(kw)) enKeywordScore += 2;
  }

  // Require Turkish-specific characters (ç, ğ, ı, ş) OR Turkish stop words / keywords
  // so German umlauts (ä, ö, ü) do not false-positive as Turkish
  const hasTurkishEvidence = trSpecificChars > 0 || trKeywordScore >= 2;
  if (!hasTurkishEvidence) {
    return 'en';
  }

  const trTotal = trSpecificChars * 2 + trSharedChars * 0.5 + trKeywordScore;
  return trTotal >= enKeywordScore ? 'tr' : 'en';
}

// --- TAXONOMY & REGEX DICTIONARIES ---

export interface TechSkillDef {
  name: string;
  pattern: RegExp;
}

export const TECH_SKILLS_DICTIONARY: TechSkillDef[] = [
  // Languages
  { name: 'TypeScript', pattern: new RegExp(wbStart + 'typescript' + wbEnd, 'iu') },
  { name: 'JavaScript', pattern: new RegExp(wbStart + 'javascript' + wbEnd, 'iu') },
  { name: 'Python', pattern: new RegExp(wbStart + 'python' + wbEnd, 'iu') },
  { name: 'Java', pattern: new RegExp(wbStart + 'java(?!script)' + wbEnd, 'iu') },
  { name: 'C#', pattern: new RegExp(wbStart + 'c#' + wbEnd, 'iu') },
  { name: 'C++', pattern: new RegExp(wbStart + 'c\\+\\+' + wbEnd, 'iu') },
  { name: 'Go', pattern: new RegExp(wbStart + '(?:golang|go)' + wbEnd, 'iu') },
  { name: 'Rust', pattern: new RegExp(wbStart + 'rust' + wbEnd, 'iu') },
  { name: 'PHP', pattern: new RegExp(wbStart + 'php' + wbEnd, 'iu') },
  { name: 'Ruby', pattern: new RegExp(wbStart + 'ruby' + wbEnd, 'iu') },
  { name: 'Kotlin', pattern: new RegExp(wbStart + 'kotlin' + wbEnd, 'iu') },
  { name: 'Swift', pattern: new RegExp(wbStart + 'swift' + wbEnd, 'iu') },
  { name: 'SQL', pattern: new RegExp(wbStart + 'sql' + wbEnd, 'iu') },

  // Frontend
  { name: 'React', pattern: new RegExp(wbStart + 'react(?:\\.js)?' + wbEnd, 'iu') },
  { name: 'Next.js', pattern: new RegExp(wbStart + 'next(?:\\.js)?' + wbEnd, 'iu') },
  { name: 'Vue.js', pattern: new RegExp(wbStart + 'vue(?:\\.js)?' + wbEnd, 'iu') },
  { name: 'Nuxt.js', pattern: new RegExp(wbStart + 'nuxt(?:\\.js)?' + wbEnd, 'iu') },
  { name: 'Angular', pattern: new RegExp(wbStart + 'angular' + wbEnd, 'iu') },
  { name: 'Svelte', pattern: new RegExp(wbStart + 'svelte' + wbEnd, 'iu') },
  { name: 'Tailwind CSS', pattern: new RegExp(wbStart + 'tailwind(?:\\s*css)?' + wbEnd, 'iu') },
  { name: 'HTML5', pattern: new RegExp(wbStart + 'html5?' + wbEnd, 'iu') },
  { name: 'CSS3', pattern: new RegExp(wbStart + 'css3?' + wbEnd, 'iu') },
  { name: 'Redux', pattern: new RegExp(wbStart + 'redux' + wbEnd, 'iu') },

  // Backend
  { name: 'Node.js', pattern: new RegExp(wbStart + 'node(?:\\.js)?' + wbEnd, 'iu') },
  { name: 'Express.js', pattern: new RegExp(wbStart + 'express(?:\\.js)?' + wbEnd, 'iu') },
  { name: 'NestJS', pattern: new RegExp(wbStart + 'nest(?:\\.js)?' + wbEnd, 'iu') },
  { name: '.NET', pattern: new RegExp(wbStart + '\\.net(?:\\s+core)?' + wbEnd, 'iu') },
  { name: 'Spring Boot', pattern: new RegExp(wbStart + 'spring(?:\\s+boot)?' + wbEnd, 'iu') },
  { name: 'Django', pattern: new RegExp(wbStart + 'django' + wbEnd, 'iu') },
  { name: 'FastAPI', pattern: new RegExp(wbStart + 'fastapi' + wbEnd, 'iu') },
  { name: 'Flask', pattern: new RegExp(wbStart + 'flask' + wbEnd, 'iu') },
  { name: 'Laravel', pattern: new RegExp(wbStart + 'laravel' + wbEnd, 'iu') },

  // Databases & Caching
  { name: 'PostgreSQL', pattern: new RegExp(wbStart + '(?:postgres|postgresql)' + wbEnd, 'iu') },
  { name: 'MySQL', pattern: new RegExp(wbStart + 'mysql' + wbEnd, 'iu') },
  { name: 'MSSQL', pattern: new RegExp(wbStart + '(?:mssql|sql\\s+server)' + wbEnd, 'iu') },
  { name: 'MongoDB', pattern: new RegExp(wbStart + 'mongodb' + wbEnd, 'iu') },
  { name: 'Redis', pattern: new RegExp(wbStart + 'redis' + wbEnd, 'iu') },
  { name: 'Elasticsearch', pattern: new RegExp(wbStart + 'elasticsearch' + wbEnd, 'iu') },

  // DevOps & Cloud
  { name: 'Docker', pattern: new RegExp(wbStart + 'docker' + wbEnd, 'iu') },
  { name: 'Kubernetes', pattern: new RegExp(wbStart + '(?:kubernetes|k8s)' + wbEnd, 'iu') },
  { name: 'AWS', pattern: new RegExp(wbStart + '(?:aws|amazon\\s+web\\s+services)' + wbEnd, 'iu') },
  { name: 'Azure', pattern: new RegExp(wbStart + 'azure' + wbEnd, 'iu') },
  { name: 'Google Cloud (GCP)', pattern: new RegExp(wbStart + '(?:gcp|google\\s+cloud)' + wbEnd, 'iu') },
  { name: 'Terraform', pattern: new RegExp(wbStart + 'terraform' + wbEnd, 'iu') },
  { name: 'CI/CD', pattern: new RegExp(wbStart + 'ci[\\/-]?cd' + wbEnd, 'iu') },
  { name: 'Jenkins', pattern: new RegExp(wbStart + 'jenkins' + wbEnd, 'iu') },
  { name: 'GitHub Actions', pattern: new RegExp(wbStart + 'github\\s+actions' + wbEnd, 'iu') },
  { name: 'Linux', pattern: new RegExp(wbStart + 'linux' + wbEnd, 'iu') },
  { name: 'Nginx', pattern: new RegExp(wbStart + 'nginx' + wbEnd, 'iu') },

  // APIs & Messaging
  { name: 'GraphQL', pattern: new RegExp(wbStart + 'graphql' + wbEnd, 'iu') },
  { name: 'REST API', pattern: new RegExp(wbStart + 'rest(?:ful)?(?:\\s+api)?' + wbEnd, 'iu') },
  { name: 'gRPC', pattern: new RegExp(wbStart + 'grpc' + wbEnd, 'iu') },
  { name: 'Kafka', pattern: new RegExp(wbStart + 'kafka' + wbEnd, 'iu') },
  { name: 'RabbitMQ', pattern: new RegExp(wbStart + 'rabbitmq' + wbEnd, 'iu') },

  // Version Control
  { name: 'Git', pattern: new RegExp(wbStart + '(?:git|github|gitlab)' + wbEnd, 'iu') },
];

export interface SkillPatternDef {
  nameEn: string;
  nameTr: string;
  pattern: RegExp;
}

export const HARD_SKILLS_DICTIONARY: SkillPatternDef[] = [
  { nameEn: 'RESTful API Design', nameTr: 'RESTful API Tasarımı', pattern: new RegExp(wbStart + '(?:rest(?:ful)?\\s+api|web\\s+servis|api\\s+design|api\\s+tasarımı|api\\s+tasarimi)' + wbEnd, 'iu') },
  { nameEn: 'Microservices Architecture', nameTr: 'Mikroservis Mimarisi', pattern: new RegExp(wbStart + '(?:microservices?|mikroservis|mikro\\s+servis|dağıtık\\s+sistemler|dagitik\\s+sistemler)' + wbEnd, 'iu') },
  { nameEn: 'Database Architecture & Modeling', nameTr: 'İlişkisel Veritabanı Modelleme', pattern: new RegExp(wbStart + '(?:database\\s+design|database\\s+architecture|data\\s+modeling|veritabanı\\s+tasarımı|veritabani\\s+tasarimi|şema\\s+tasarımı|sema\\s+tasarimi|ilişkisel\\s+veritabanı|iliskisel\\s+veritabani)' + wbEnd, 'iu') },
  { nameEn: 'System Architecture & Design', nameTr: 'Sistem Mimarisi ve Tasarımı', pattern: new RegExp(wbStart + '(?:system\\s+design|system\\s+architecture|sistem\\s+mimarisi|sistem\\s+tasarımı|sistem\\s+tasarimi|yazılım\\s+mimarisi|yazilim\\s+mimarisi)' + wbEnd, 'iu') },
  { nameEn: 'Unit Testing & TDD', nameTr: 'Birim Test (Unit Testing)', pattern: new RegExp(wbStart + '(?:unit\\s+test(?:ing)?|birim\\s+test|tdd|test\\s+driven|test\\s+güdümlü|test\\s+gudumlu)' + wbEnd, 'iu') },
  { nameEn: 'CI/CD Pipelines', nameTr: 'Sürekli Entegrasyon (CI/CD Süreçleri)', pattern: new RegExp(wbStart + '(?:ci[\\/-]?cd|continuous\\s+integration|sürekli\\s+entegrasyon|surekli\\s+entegrasyon|dağıtım\\s+süreçleri|dagitim\\s+surecleri)' + wbEnd, 'iu') },
  { nameEn: 'Agile / Scrum Methodologies', nameTr: 'Agile / Scrum Metodolojileri', pattern: new RegExp(wbStart + '(?:agile|scrum|sprint|kanban|çevik\\s+yazılım|cevik\\s+yazilim)' + wbEnd, 'iu') },
  { nameEn: 'Object-Oriented Programming (OOP)', nameTr: 'Nesne Yönelimli Programlama (OOP)', pattern: new RegExp(wbStart + '(?:oop|object[\\s-]oriented|nesne\\s+yönelimli|nesne\\s+yonelimli)' + wbEnd, 'iu') },
  { nameEn: 'Performance Optimization', nameTr: 'Performans Optimizasyonu', pattern: new RegExp(wbStart + '(?:performance\\s+optimiz(?:ation|e)|performans\\s+optimizasyonu|yük\\s+ve\\s+hız|yuk\\s+ve\\s+hiz)' + wbEnd, 'iu') },
  { nameEn: 'Security Best Practices & OWASP', nameTr: 'Bilgi Güvenliği ve OWASP Prensipleri', pattern: new RegExp(wbStart + '(?:security\\s+best\\s+practices|owasp|cyber\\s+security|bilgi\\s+güvenliği|bilgi\\s+guvenligi)' + wbEnd, 'iu') },
  { nameEn: 'Code Review & Refactoring', nameTr: 'Kod İnceleme ve Refactoring', pattern: new RegExp(wbStart + '(?:code\\s+review|refactoring|kod\\s+inceleme|kod\\s+kalitesi)' + wbEnd, 'iu') },
  { nameEn: 'Cloud Infrastructure', nameTr: 'Bulut Bilişim ve Altyapı', pattern: new RegExp(wbStart + '(?:cloud\\s+infrastructure|cloud\\s+computing|bulut\\s+bilişim|bulut\\s+bilisim)' + wbEnd, 'iu') },
  { nameEn: 'Containerization', nameTr: 'Konteynerleştirme Teknolojileri', pattern: new RegExp(wbStart + '(?:containerization|konteynerleştirme|konteynerlestirme)' + wbEnd, 'iu') },
  { nameEn: 'Frontend Development', nameTr: 'Ön Yüz Geliştirme', pattern: new RegExp(wbStart + '(?:frontend|front-end|ön\\s+yüz|on\\s+yuz)' + wbEnd, 'iu') },
  { nameEn: 'Backend Development', nameTr: 'Arka Yüz Geliştirme', pattern: new RegExp(wbStart + '(?:backend|back-end|arka\\s+yüz|arka\\s+yuz)' + wbEnd, 'iu') },
  { nameEn: 'Data Structures & Algorithms', nameTr: 'Veri Yapıları ve Algoritmalar', pattern: new RegExp(wbStart + '(?:data\\s+structures|veri\\s+yapıları|veri\\s+yapilari|algorithms|algoritmalar)' + wbEnd, 'iu') },
];

export const SOFT_SKILLS_DICTIONARY: SkillPatternDef[] = [
  { nameEn: 'Problem Solving', nameTr: 'Problem Çözme', pattern: new RegExp(wbStart + '(?:problem\\s+solving|problem\\s+çözme|problem\\s+cozme|sorun\\s+çözme|çözüm\\s+odaklı|cozum\\s+odakli)' + wbEnd, 'iu') },
  { nameEn: 'Teamwork & Collaboration', nameTr: 'Takım Çalışması', pattern: new RegExp(wbStart + '(?:teamwork|team\\s+player|collaboration|takım\\s+çalışması|takim\\s+calismasi|ekip\\s+çalışması|ekip\\s+calismasi)' + wbEnd, 'iu') },
  { nameEn: 'Communication Skills', nameTr: 'Etkili İletişim', pattern: new RegExp(wbStart + '(?:communication\\s+skills?|strong\\s+communicator|iletişim\\s+becerisi|iletisim\\s+becerisi|etkili\\s+iletişim|etkili\\s+iletisim|güçlü\\s+iletişim|guclu\\s+iletisim)' + wbEnd, 'iu') },
  { nameEn: 'Analytical Thinking', nameTr: 'Analitik Düşünme', pattern: new RegExp(wbStart + '(?:analytical\\s+thinking|analitik\\s+düşünme|analitik\\s+dusunme|analitik\\s+bakış|analitik\\s+bakis)' + wbEnd, 'iu') },
  { nameEn: 'Time Management & Prioritization', nameTr: 'Zaman Yönetimi ve Planlama', pattern: new RegExp(wbStart + '(?:time\\s+management|prioritization|zaman\\s+yönetimi|zaman\\s+yonetimi|önceliklendirme|onceliklendirme)' + wbEnd, 'iu') },
  { nameEn: 'Adaptability & Continuous Learning', nameTr: 'Öğrenmeye ve Gelişime Açıklık', pattern: new RegExp(wbStart + '(?:adaptability|fast\\s+learner|continuous\\s+learning|öğrenmeye\\s+açık|ogrenmeye\\s+acik|gelişime\\s+açık|gelisime\\s+acik|hızlı\\s+öğrenebilen|hizli\\s+ogrenebilen)' + wbEnd, 'iu') },
  { nameEn: 'Attention to Detail', nameTr: 'Detaylara Dikkat', pattern: new RegExp(wbStart + '(?:attention\\s+to\\s+detail|detail[\\s-]oriented|detaylara\\s+dikkat|titiz\\s+çalışma|titiz\\s+calisma)' + wbEnd, 'iu') },
  { nameEn: 'Leadership & Initiative', nameTr: 'Liderlik ve İnisiyatif Alma', pattern: new RegExp(wbStart + '(?:leadership|initiative|proactive|liderlik|inisiyatif|proaktif)' + wbEnd, 'iu') },
  { nameEn: 'Responsibility & Ownership', nameTr: 'Sorumluluk Bilinci', pattern: new RegExp(wbStart + '(?:responsibility|accountability|ownership|sorumluluk\\s+sahibi|sorumluluk\\s+bilinci)' + wbEnd, 'iu') },
  { nameEn: 'Documentation & Presentation', nameTr: 'Dokümantasyon ve Sunum', pattern: new RegExp(wbStart + '(?:documentation|presentation|dokümantasyon|dokumantasyon|raporlama|sunum\\s+becerisi)' + wbEnd, 'iu') },
];

export function extractExperienceYears(text: string): number | null {
  const norm = text.toLocaleLowerCase('tr-TR');
  const enNorm = text.toLowerCase();

  // Turkish patterns
  const trHeaderMatch = norm.match(/(?:tecrübe|tecrube|deneyim)(?:\s+süresi)?:\s*(?:en\s+az\s*)?(\d+)/i);
  if (trHeaderMatch) return parseInt(trHeaderMatch[1], 10);

  const trMinMatch = norm.match(/(?:en\s+az|minimum|min\.?)\s*(\d+)\s*(?:yıl|yil|sene)/i);
  if (trMinMatch) return parseInt(trMinMatch[1], 10);

  const trRangeMatch = norm.match(/(\d+)\s*(?:[-–—]|\bila\b)\s*(\d+)\s*(?:yıl|yil|sene)/i);
  if (trRangeMatch) return parseInt(trRangeMatch[1], 10);

  const trGeneralMatch = norm.match(/(\d+)\+?\s*(?:yıl|yil|yıllık|yillik|sene|senelik)(?:\s+ve\s+üzeri)?\s*(?:sektör|iş|mesleki|profesyonel)?\s*(?:tecrübe|deneyim)/i);
  if (trGeneralMatch) return parseInt(trGeneralMatch[1], 10);

  if (new RegExp(wbStart + '(?:yeni\\s+mezun|stajyer)' + wbEnd, 'iu').test(norm)) return 0;

  // English patterns
  const enHeaderMatch = enNorm.match(/(?:experience|exp)(?:\s+required)?:\s*(?:at\s+least\s*)?(\d+)/i);
  if (enHeaderMatch) return parseInt(enHeaderMatch[1], 10);

  const enMinMatch = enNorm.match(/(?:at\s+least|minimum|min\.?)\s*(\d+)\+?\s*(?:years?|yrs?)/i);
  if (enMinMatch) return parseInt(enMinMatch[1], 10);

  const enRangeMatch = enNorm.match(/(\d+)\s*(?:[-–—]|\bto\b)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (enRangeMatch) return parseInt(enRangeMatch[1], 10);

  const enGeneralMatch = enNorm.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i);
  if (enGeneralMatch) return parseInt(enGeneralMatch[1], 10);

  // Standalone duration matchers for "5 yıl" and "5+ years"
  const trDirectMatch = norm.match(/(?:^|[^\d])(\d+)\+?\s*(?:yıl|yil|sene)(?:[^\w]|$)/i);
  if (trDirectMatch) return parseInt(trDirectMatch[1], 10);

  const enDirectMatch = enNorm.match(/(?:^|[^\d])(\d+)\+?\s*(?:years?|yrs?)(?:[^\w]|$)/i);
  if (enDirectMatch) return parseInt(enDirectMatch[1], 10);

  if (new RegExp(wbStart + '(?:entry[\\s-]level|internship|intern|new\\s+grad(?:uate)?)' + wbEnd, 'iu').test(enNorm)) return 0;

  return null;
}

export function extractDegreeRequirement(text: string, language: 'en' | 'tr'): string | null {
  const norm = language === 'tr' ? text.toLocaleLowerCase('tr-TR') : text.toLowerCase();

  if (language === 'tr') {
    if (new RegExp(wbStart + '(?:doktora|ph\\.?d)' + wbEnd, 'iu').test(norm)) return 'Doktora (Doctorate)';
    if (new RegExp(wbStart + '(?:yüksek\\s+lisans|yuksek\\s+lisans|master)' + wbEnd, 'iu').test(norm)) return 'Yüksek Lisans (Master\'s Degree)';
    // Check Associate Degree ('Ön Lisans') BEFORE Bachelor's ('Lisans')
    if (new RegExp(wbStart + '(?:ön\\s*lisans|on\\s*lisans|myo|meslek\\s+yüksek\\s*okulu|meslek\\s+yuksek\\s*okulu)' + wbEnd, 'iu').test(norm)) {
      return 'Ön Lisans (Associate Degree)';
    }
    if (new RegExp(wbStart + '(?:lisans|üniversite(?:lerin)?|universite(?:lerin)?|mühendislik|muhendislik|bölümlerinden\\s+mezun|bolumlerinden\\s+mezun)' + wbEnd, 'iu').test(norm)) {
      return 'Üniversitelerin Lisans Bölümlerinden Mezun';
    }
  } else {
    if (new RegExp(wbStart + '(?:ph\\.?d\\.?|doctorate)' + wbEnd, 'iu').test(norm)) return 'Ph.D. / Doctorate';
    if (new RegExp(wbStart + '(?:master(?:\'s)?|m\\.?s\\.?|mba)' + wbEnd, 'iu').test(norm)) return 'Master\'s Degree';
    if (new RegExp(wbStart + '(?:associate(?:\'s)?(?:\\s+degree)?)' + wbEnd, 'iu').test(norm)) return 'Associate Degree';
    if (new RegExp(wbStart + '(?:bachelor(?:\'s)?|b\\.?s\\.?|b\\.?a\\.?|undergraduate|degree\\s+in)' + wbEnd, 'iu').test(norm)) {
      return 'Bachelor\'s Degree in Computer Science or related field';
    }
  }
  return null;
}

export function extractLanguageRequirements(text: string): string[] {
  const norm = text.toLocaleLowerCase('tr-TR');
  const languages: string[] = [];
  if (new RegExp(wbStart + '(?:ingilizce|english)' + wbEnd, 'iu').test(norm)) languages.push('English');
  if (new RegExp(wbStart + '(?:almanca|german)' + wbEnd, 'iu').test(norm)) languages.push('German');
  if (new RegExp(wbStart + '(?:fransızca|fransizca|french)' + wbEnd, 'iu').test(norm)) languages.push('French');
  if (new RegExp(wbStart + '(?:türkçe|turkce|turkish)' + wbEnd, 'iu').test(norm) && /\b(?:native|fluent|requirement|bilingual)\b/i.test(norm)) {
    languages.push('Turkish');
  }
  if (new RegExp(wbStart + '(?:ispanyolca|spanish)' + wbEnd, 'iu').test(norm)) languages.push('Spanish');
  return languages.length > 0 ? languages : ['English'];
}

export function extractSeniorityLevel(text: string, preferredLang?: 'en' | 'tr'): string {
  const language = preferredLang || detectLanguage(text);
  const lower = language === 'tr' ? text.toLocaleLowerCase('tr-TR') : text.toLowerCase();

  // If a specific job title line is present, evaluate it first
  const titleMatch = lower.match(/(?:job\s+title|title|position|pozisyon|rol|role):\s*([^\n\r]+)/i);
  const titleText = titleMatch ? titleMatch[1] : '';

  if (titleText) {
    if (new RegExp(wbStart + '(?:stajyer|staj|intern|internship)' + wbEnd, 'iu').test(titleText)) return 'Intern';
    if (new RegExp(wbStart + '(?:junior|yeni\\s+mezun|başlangıç|baslangic|entry[\\s-]level|associate)' + wbEnd, 'iu').test(titleText)) return 'Junior';
    if (new RegExp(wbStart + '(?:tech\\s+lead|team\\s+lead|takım\\s+lideri|takim\\s+lideri|yönetici\\s+adayı|architect|mimar|principal)' + wbEnd, 'iu').test(titleText)) return 'Lead';
    if (new RegExp(wbStart + '(?:senior|sr\\.?|kıdemli|kidemli|uzman\\s+yazılımcı)' + wbEnd, 'iu').test(titleText)) return 'Senior';
    if (new RegExp(wbStart + '(?:manager|director|müdür|mudur|yönetici|yonetici|head\\s+of)' + wbEnd, 'iu').test(titleText)) return 'Manager';
  }

  if (new RegExp(wbStart + '(?:stajyer|staj|intern|internship)' + wbEnd, 'iu').test(lower)) return 'Intern';
  if (new RegExp(wbStart + '(?:junior|yeni\\s+mezun|başlangıç|baslangic|entry[\\s-]level|associate)' + wbEnd, 'iu').test(lower)) return 'Junior';
  if (new RegExp(wbStart + '(?:tech\\s+lead|team\\s+lead|takım\\s+lideri|takim\\s+lideri|yönetici\\s+adayı|architect|mimar|principal)' + wbEnd, 'iu').test(lower)) return 'Lead';
  // Check Senior before Manager so IC roles are not misclassified
  if (new RegExp(wbStart + '(?:senior|sr\\.?|kıdemli|kidemli|uzman\\s+yazılımcı)' + wbEnd, 'iu').test(lower)) return 'Senior';

  // For Manager, ensure it is not merely referencing collaboration / reporting
  const managerPattern = new RegExp(wbStart + '(?:manager|director|müdür|mudur|yönetici|yonetici|head\\s+of)' + wbEnd, 'iu');
  if (managerPattern.test(lower)) {
    const strippedReporting = lower
      .replace(/(?:collaborate|reporting|reports|partner|work|liaise)\s+(?:closely\s+)?(?:with|to)\s+(?:the\s+)?[a-z\s]+(?:manager|director|müdür|yönetici)/gi, '')
      .replace(/(?:bağlı\s+çalış|raporla|birlikte\s+çalış)[a-z\s]+(?:yönetici|müdür)/gi, '');
    if (managerPattern.test(strippedReporting)) {
      return 'Manager';
    }
  }

  return 'Mid-Level';
}

export function extractJobRequirementsHeuristic(
  text: string,
  preferredLang?: 'en' | 'tr'
): ExtractedJobRequirements {
  const language = preferredLang || detectLanguage(text);
  const normalizedText = language === 'tr' ? text.toLocaleLowerCase('tr-TR') : text.toLowerCase();

  const techSkills: string[] = [];
  for (const item of TECH_SKILLS_DICTIONARY) {
    if (item.pattern.test(text) || item.pattern.test(normalizedText)) {
      techSkills.push(item.name);
    }
  }

  const hardSkills: string[] = [];
  for (const item of HARD_SKILLS_DICTIONARY) {
    if (item.pattern.test(text) || item.pattern.test(normalizedText)) {
      hardSkills.push(language === 'tr' ? item.nameTr : item.nameEn);
    }
  }

  const softSkills: string[] = [];
  for (const item of SOFT_SKILLS_DICTIONARY) {
    if (item.pattern.test(text) || item.pattern.test(normalizedText)) {
      softSkills.push(language === 'tr' ? item.nameTr : item.nameEn);
    }
  }

  const defaultTech = ['React', 'TypeScript', 'Node.js'];
  const defaultHard = language === 'tr'
    ? ['RESTful API Tasarımı', 'Sistem Mimarisi ve Tasarımı']
    : ['RESTful API Design', 'System Architecture & Design'];
  const defaultSoft = language === 'tr'
    ? ['Problem Çözme', 'Takım Çalışması', 'Etkili İletişim']
    : ['Problem Solving', 'Teamwork & Collaboration', 'Communication Skills'];

  return {
    hard_skills: hardSkills.length > 0 ? hardSkills : defaultHard,
    soft_skills: softSkills.length > 0 ? softSkills : defaultSoft,
    tech_skills: techSkills.length > 0 ? techSkills : defaultTech,
    years_experience_required: extractExperienceYears(text),
    degree_requirement: extractDegreeRequirement(text, language),
    language_requirements: extractLanguageRequirements(text),
    seniority_level: extractSeniorityLevel(text, language),
  };
}
