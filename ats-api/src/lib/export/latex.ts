import type { ResumeStructure, Language } from '@ats-analyzer/contracts';
import { resolveSectionTitles, formatPresentDate, escapeLatex } from './utils.js';

export { escapeLatex };

/**
 * Generate clean, ATS-safe LaTeX (.tex) markup with UTF-8 inputenc,
 * localized section headers, and full character escaping.
 */
export function generateLatexResume(resume: ResumeStructure, language: Language = 'en'): string {
  const titles = resolveSectionTitles(language, resume.sectionTitles);
  const presentText = formatPresentDate(language);

  const contact = resume.contact || { name: '', email: '', phone: '', links: [] };
  const linksFormatted = (contact.links || [])
    .map((l) => `\\href{${escapeLatex(l)}}{${escapeLatex(l)}}`)
    .join(' $|$ ');

  let latex = `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{lmodern}
\\hypersetup{hidelinks}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\newcommand{\\resumesection}[1]{%
  \\vspace{6pt}%
  {\\large\\bfseries\\MakeUppercase{#1}}%
  \\vspace{2pt}\\hrule\\vspace{4pt}%
}

\\begin{document}

% --- CONTACT HEADER ---
\\begin{center}
  {\\LARGE\\bfseries ${escapeLatex(contact.name)}} \\\\ \\vspace{3pt}
  ${escapeLatex(contact.email)}${contact.phone ? ` $|$ ${escapeLatex(contact.phone)}` : ''}${linksFormatted ? ` $|$ ${linksFormatted}` : ''}
\\end{center}
\\vspace{4pt}
`;

  // SUMMARY
  if (resume.summary) {
    latex += `\\resumesection{${escapeLatex(titles.summary)}}
${escapeLatex(resume.summary)}
\\vspace{4pt}
`;
  }

  // EXPERIENCE
  if (resume.experience && resume.experience.length > 0) {
    latex += `\\resumesection{${escapeLatex(titles.experience)}}
`;
    for (const exp of resume.experience) {
      const endDate = exp.endDate ? escapeLatex(exp.endDate) : presentText;
      latex += `\\textbf{${escapeLatex(exp.title)}} \\hfill \\textit{${escapeLatex(exp.company)} $|$ ${escapeLatex(exp.startDate)} -- ${endDate}} \\par
`;
      if (exp.description) {
        latex += `${escapeLatex(exp.description)} \\par
`;
      }
      if (exp.bullets && exp.bullets.length > 0) {
        latex += `\\begin{itemize}[leftmargin=1.5em, nosep, itemsep=2pt]
`;
        for (const bullet of exp.bullets) {
          latex += `  \\item ${escapeLatex(bullet)}
`;
        }
        latex += `\\end{itemize}
`;
      }
      latex += `\\vspace{3pt}
`;
    }
  }

  // EDUCATION
  if (resume.education && resume.education.length > 0) {
    latex += `\\resumesection{${escapeLatex(titles.education)}}
`;
    for (const edu of resume.education) {
      const endDate = edu.endDate ? escapeLatex(edu.endDate) : presentText;
      latex += `\\textbf{${escapeLatex(edu.degree)}} \\hfill \\textit{${escapeLatex(edu.institution)} $|$ ${escapeLatex(edu.startDate)} -- ${endDate}} \\par
\\vspace{2pt}
`;
    }
  }

  // SKILLS
  if (resume.skills && resume.skills.length > 0) {
    latex += `\\resumesection{${escapeLatex(titles.skills)}}
${escapeLatex(resume.skills.join(', '))}
\\vspace{4pt}
`;
  }

  // PROJECTS
  if (resume.projects && resume.projects.length > 0) {
    latex += `\\resumesection{${escapeLatex(titles.projects)}}
`;
    for (const proj of resume.projects) {
      latex += `\\textbf{${escapeLatex(proj.name)}}${proj.link ? ` (\\href{${escapeLatex(proj.link)}}{${escapeLatex(proj.link)}})` : ''} \\par
`;
      if (proj.description) {
        latex += `${escapeLatex(proj.description)} \\par
`;
      }
      latex += `\\vspace{2pt}
`;
    }
  }

  latex += `\\end{document}\n`;
  return latex;
}
