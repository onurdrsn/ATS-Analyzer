import { DEFAULT_SECTION_TITLES, type Language, type StructuredResume } from '@ats-analyzer/contracts';

/**
 * Generates an ATS-friendly HTML-based Word document (.docx) fallback
 * which is natively recognized by Microsoft Word and LibreOffice.
 */
export function generateWordHtmlDocument(data: StructuredResume, language: Language = 'en'): string {
  const titles = data.sectionTitles
    ? { ...DEFAULT_SECTION_TITLES[language], ...data.sectionTitles }
    : DEFAULT_SECTION_TITLES[language] || DEFAULT_SECTION_TITLES.en;

  const presentText = language === 'tr' ? 'Günümüz' : 'Present';

  const contactParts = [
    data.contact?.email,
    data.contact?.phone,
    ...(data.contact?.links || []),
  ].filter(Boolean);

  let html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${data.contact?.name || 'Resume'}</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.3; color: #111; margin: 1in; }
    h1 { font-size: 20pt; text-align: center; margin-bottom: 4pt; }
    .contact { font-size: 10pt; text-align: center; color: #444; margin-bottom: 16pt; }
    h2 { font-size: 12pt; text-transform: uppercase; border-bottom: 1.5pt solid #222; padding-bottom: 2pt; margin-top: 14pt; margin-bottom: 6pt; }
    .job-title { font-weight: bold; }
    .company-date { font-style: italic; color: #555; }
    .header-row { display: flex; justify-content: space-between; margin-bottom: 2pt; }
    ul { margin-top: 3pt; margin-bottom: 6pt; padding-left: 18pt; }
    li { margin-bottom: 2pt; font-size: 10pt; }
    p { margin-top: 2pt; margin-bottom: 4pt; font-size: 10.5pt; }
  </style>
</head>
<body>
  <h1>${data.contact?.name || 'Applicant'}</h1>
  <div class="contact">${contactParts.join(' &nbsp;|&nbsp; ')}</div>
`;

  // SUMMARY
  if (data.summary && data.summary.trim()) {
    html += `  <h2>${titles.summary}</h2>\n  <p>${data.summary}</p>\n`;
  }

  // SKILLS
  if (data.skills && data.skills.length > 0) {
    html += `  <h2>${titles.skills}</h2>\n  <p>${data.skills.join(', ')}</p>\n`;
  }

  // EXPERIENCE
  if (data.experience && data.experience.length > 0) {
    html += `  <h2>${titles.experience}</h2>\n`;
    for (const exp of data.experience) {
      const endDate = exp.endDate || presentText;
      html += `  <div>
    <div class="header-row">
      <span class="job-title">${exp.title}</span> &mdash; <span class="company-date">${exp.company} &nbsp;(${exp.startDate} - ${endDate})</span>
    </div>\n`;
      if (exp.description) {
        html += `    <p>${exp.description}</p>\n`;
      }
      if (exp.bullets && exp.bullets.length > 0) {
        html += `    <ul>\n`;
        for (const bullet of exp.bullets) {
          html += `      <li>${bullet}</li>\n`;
        }
        html += `    </ul>\n`;
      }
      html += `  </div>\n`;
    }
  }

  // EDUCATION
  if (data.education && data.education.length > 0) {
    html += `  <h2>${titles.education}</h2>\n`;
    for (const edu of data.education) {
      const endDate = edu.endDate || presentText;
      html += `  <div>
    <span class="job-title">${edu.degree}</span> &mdash; <span class="company-date">${edu.institution} &nbsp;(${edu.startDate} - ${endDate})</span>
  </div>\n`;
    }
  }

  // PROJECTS
  if (data.projects && data.projects.length > 0) {
    html += `  <h2>${titles.projects}</h2>\n`;
    for (const proj of data.projects) {
      html += `  <p><strong>${proj.name}</strong>${proj.link ? ` (<a href="${proj.link}">${proj.link}</a>)` : ''}: ${proj.description}</p>\n`;
    }
  }

  html += `</body>\n</html>\n`;
  return html;
}
