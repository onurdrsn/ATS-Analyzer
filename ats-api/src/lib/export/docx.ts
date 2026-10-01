import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopType,
  TabStopPosition,
} from 'docx';
import type { ResumeStructure, Language } from '@ats-analyzer/contracts';
import { resolveSectionTitles, formatPresentDate } from './utils.js';

/**
 * Generate clean, ATS-safe single-column DOCX document with localized headers
 * and native UTF-8 Turkish diacritics.
 */
export async function generateDocxResume(resume: ResumeStructure, language: Language = 'en'): Promise<Buffer> {
  const titles = resolveSectionTitles(language, resume.sectionTitles);
  const presentText = formatPresentDate(language);
  const children: Paragraph[] = [];

  // CONTACT HEADER
  if (resume.contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: resume.contact.name,
            bold: true,
            size: 32, // 16pt
            font: 'Calibri',
          }),
        ],
      })
    );

    const contactParts = [
      resume.contact.email,
      resume.contact.phone,
      ...(resume.contact.links || []),
    ].filter(Boolean);

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactParts.join('  |  '),
            size: 20, // 10pt
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  const addSectionTitle = (title: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        thematicBreak: true,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: title.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US'),
            bold: true,
            size: 24, // 12pt
            font: 'Calibri',
          }),
        ],
      })
    );
  };

  // SUMMARY
  if (resume.summary) {
    addSectionTitle(titles.summary);
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: resume.summary,
            size: 21, // 10.5pt
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // EXPERIENCE
  if (resume.experience && resume.experience.length > 0) {
    addSectionTitle(titles.experience);
    for (const exp of resume.experience) {
      const endDate = exp.endDate || presentText;
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({ text: exp.title, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ children: ['\t'] }),
            new TextRun({ text: `${exp.company}  |  ${exp.startDate} - ${endDate}`, italics: true, size: 20, font: 'Calibri' }),
          ],
        })
      );
      if (exp.description) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: exp.description, size: 20, font: 'Calibri' })],
          })
        );
      }
      if (exp.bullets) {
        for (const bullet of exp.bullets) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text: bullet, size: 20, font: 'Calibri' })],
            })
          );
        }
      }
    }
  }

  // EDUCATION
  if (resume.education && resume.education.length > 0) {
    addSectionTitle(titles.education);
    for (const edu of resume.education) {
      const endDate = edu.endDate || presentText;
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ children: ['\t'] }),
            new TextRun({ text: `${edu.institution}  |  ${edu.startDate} - ${endDate}`, italics: true, size: 20, font: 'Calibri' }),
          ],
        })
      );
    }
  }

  // SKILLS
  if (resume.skills && resume.skills.length > 0) {
    addSectionTitle(titles.skills);
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: resume.skills.join(', '), size: 20, font: 'Calibri' })],
      })
    );
  }

  // PROJECTS
  if (resume.projects && resume.projects.length > 0) {
    addSectionTitle(titles.projects);
    for (const proj of resume.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: proj.name, bold: true, size: 22, font: 'Calibri' }),
            ...(proj.link ? [new TextRun({ text: ` (${proj.link})`, italics: true, size: 18, font: 'Calibri' })] : []),
          ],
        })
      );
      if (proj.description) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: proj.description, size: 20, font: 'Calibri' })],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 }, // 0.75in margins
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
