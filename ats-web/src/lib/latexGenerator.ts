import { DEFAULT_SECTION_TITLES, type Language, type StructuredResume } from '@ats-analyzer/contracts';

/**
 * Escapes LaTeX special control characters to prevent syntax compilation errors.
 */
export function escapeLatex(text?: string | null): string {
  if (!text) return '';
  return text.replace(/[\\&%$#_{}~^]/g, (char) => {
    switch (char) {
      case '\\':
        return '\\textbackslash{}';
      case '&':
        return '\\&';
      case '%':
        return '\\%';
      case '$':
        return '\\$';
      case '#':
        return '\\#';
      case '_':
        return '\\_';
      case '{':
        return '\\{';
      case '}':
        return '\\}';
      case '~':
        return '\\textasciitilde{}';
      case '^':
        return '\\textasciicircum{}';
      default:
        return char;
    }
  });
}

/**
 * Generates an ATS-safe, clean single-column LaTeX resume document string.
 */
export function generateLatexSource(data: StructuredResume, language: Language = 'en'): string {
  const titles = DEFAULT_SECTION_TITLES[language] || DEFAULT_SECTION_TITLES.en;
  const presentText = language === 'tr' ? 'Günümüz' : 'Present';

  const contactLinks = (data.contact?.links || [])
    .map((link) => `| \\url{${escapeLatex(link)}}`)
    .join(' ');

  let latex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}

\\pagestyle{empty}

\\begin{document}

% HEADER
\\begin{center}
  {\\Huge \\textbf{${escapeLatex(data.contact?.name || 'Applicant')}}}\\\\[4pt]
  \\small ${escapeLatex(data.contact?.email || '')} ${data.contact?.phone ? `| ${escapeLatex(data.contact.phone)}` : ''} ${contactLinks}
\\end{center}
`;

  // SUMMARY
  if (data.summary && data.summary.trim()) {
    latex += `
% SUMMARY
\\section*{${titles.summary}}
${escapeLatex(data.summary)}
`;
  }

  // SKILLS
  if (data.skills && data.skills.length > 0) {
    latex += `
% SKILLS
\\section*{${titles.skills}}
${escapeLatex(data.skills.join(', '))}
`;
  }

  // EXPERIENCE
  if (data.experience && data.experience.length > 0) {
    latex += `
% EXPERIENCE
\\section*{${titles.experience}}
\\begin{itemize}[leftmargin=*]
`;
    for (const exp of data.experience) {
      const endDate = exp.endDate || presentText;
      latex += `  \\item \\textbf{${escapeLatex(exp.title)}} --- \\textit{${escapeLatex(exp.company)}} \\hfill ${escapeLatex(exp.startDate)} - ${escapeLatex(endDate)}\n`;
      if (exp.description && exp.description.trim()) {
        latex += `  ${escapeLatex(exp.description)}\\\\\n`;
      }
      if (exp.bullets && exp.bullets.length > 0) {
        latex += `  \\begin{itemize}\n`;
        for (const bullet of exp.bullets) {
          latex += `    \\item ${escapeLatex(bullet)}\n`;
        }
        latex += `  \\end{itemize}\n`;
      }
    }
    latex += `\\end{itemize}\n`;
  }

  // EDUCATION
  if (data.education && data.education.length > 0) {
    latex += `
% EDUCATION
\\section*{${titles.education}}
\\begin{itemize}[leftmargin=*]
`;
    for (const edu of data.education) {
      const endDate = edu.endDate || presentText;
      latex += `  \\item \\textbf{${escapeLatex(edu.degree)}} --- \\textit{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.startDate)} - ${escapeLatex(endDate)}\n`;
    }
    latex += `\\end{itemize}\n`;
  }

  // PROJECTS
  if (data.projects && data.projects.length > 0) {
    latex += `
% PROJECTS
\\section*{${titles.projects}}
\\begin{itemize}[leftmargin=*]
`;
    for (const proj of data.projects) {
      const linkStr = proj.link ? ` (\\url{${escapeLatex(proj.link)}})` : '';
      latex += `  \\item \\textbf{${escapeLatex(proj.name)}}${linkStr}: ${escapeLatex(proj.description)}\n`;
    }
    latex += `\\end{itemize}\n`;
  }

  latex += `
\\end{document}
`;

  return latex;
}
