import type { StructuredResume } from '@ats-analyzer/contracts';

export const SAMPLE_RESUME_EN: StructuredResume = {
  language: 'en',
  contact: {
    name: 'Alex Developer',
    email: 'alex@example.com',
    phone: '+1 555-0199',
    links: ['github.com/alexdev', 'linkedin.com/in/alexdev'],
  },
  summary: 'Full-stack software engineer with 4+ years of experience building scalable web applications and microservices.',
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Git', 'RESTful APIs', 'CI/CD'],
  experience: [
    {
      company: 'CloudTech Systems',
      title: 'Senior Software Engineer',
      startDate: '2022',
      endDate: 'Present',
      description: 'Lead full-stack engineer on enterprise microservices.',
      bullets: [
        'Engineered resilient REST APIs handling 5M daily requests with Node.js and PostgreSQL.',
        'Reduced client bundle size by 35% through code splitting and tree shaking in React.',
      ],
    },
  ],
  education: [
    { institution: 'Tech University', degree: 'B.S. in Computer Science', startDate: '2018', endDate: '2022' },
  ],
  projects: [
    { name: 'ATS Optimizer', description: 'Open-source ATS resume matcher built with React and Hono.', link: 'https://github.com' },
  ],
};

export const SAMPLE_RESUME_TR: StructuredResume = {
  language: 'tr',
  contact: {
    name: 'Can Yılmaz',
    email: 'can.yilmaz@example.com',
    phone: '+90 532 555 0199',
    links: ['github.com/canyilmaz', 'linkedin.com/in/canyilmaz'],
  },
  summary: 'Web uygulamaları ve mikroservis mimarileri konusunda 4 yıldan fazla deneyimli Full-Stack Yazılım Mühendisi.',
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Git', 'RESTful API', 'CI/CD'],
  experience: [
    {
      company: 'Bulut Bilişim Sistemleri',
      title: 'Kıdemli Yazılım Mühendisi',
      startDate: '2022',
      endDate: 'Günümüz',
      description: 'Kurumsal mikroservis projelerinde teknik liderlik.',
      bullets: [
        'Node.js ve PostgreSQL kullanarak günlük 5 milyon istek alan dayanıklı REST API servisleri tasarladı.',
        'React kod bölme ve optimizasyon teknikleriyle istemci paket boyutunu %35 oranında düşürdü.',
      ],
    },
  ],
  education: [
    { institution: 'İstanbul Teknik Üniversitesi', degree: 'Bilgisayar Mühendisliği Lisans', startDate: '2018', endDate: '2022' },
  ],
  projects: [
    { name: 'ATS Uyum Analizörü', description: 'React ve Hono ile geliştirilmiş açık kaynaklı ATS özgeçmiş eşleştirici.', link: 'https://github.com' },
  ],
};

export const SAMPLE_JOB_EN = `We are looking for a Senior Full-Stack Engineer with extensive experience in React, TypeScript, Node.js, and Docker. Experience with API Design, Database Architecture (PostgreSQL), and CI/CD pipelines is required. Strong communication and problem-solving skills needed. 3+ years experience required.`;

export const SAMPLE_JOB_TR = `Genel Nitelikler:
- Üniversitelerin Bilgisayar Mühendisliği veya ilgili bölümlerinden mezun,
- React, TypeScript, Node.js ve Docker teknolojilerinde en az 3 yıl profesyonel deneyimli,
- RESTful API tasarımı, Mikroservisler ve PostgreSQL veritabanı mimarisi konularında tecrübeli,
- Git versiyon kontrol ve CI/CD süreçlerine hakim,
- Takım çalışmasına yatkın, analitik düşünme yeteneğine sahip Kıdemli Full-Stack Yazılım Mühendisi arıyoruz.`;
