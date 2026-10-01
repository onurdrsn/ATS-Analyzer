import PDFDocument from 'pdfkit';
import type { ResumeStructure, Language } from '@ats-analyzer/contracts';
import { resolveSectionTitles, formatPresentDate } from './utils.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Generate clean, ATS-safe single-column PDF document using PDFKit with localized headers.
 */
export async function generatePdfResume(resume: ResumeStructure, language: Language = 'en'): Promise<Buffer> {
  const titles = resolveSectionTitles(language, resume.sectionTitles);
  const presentText = formatPresentDate(language);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: resume.contact?.name ? `${resume.contact.name} - Resume` : 'Resume',
        Author: resume.contact?.name || 'ATS Analyzer',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Look for Unicode-compatible fonts to support Turkish diacritics natively
    const candidateFonts = [
      {
        regular: path.resolve('src/assets/fonts/Roboto-Regular.ttf'),
        bold: path.resolve('src/assets/fonts/Roboto-Bold.ttf'),
        italic: path.resolve('src/assets/fonts/Roboto-Italic.ttf'),
      },
      {
        regular: '/usr/share/fonts/truetype/Carlito-Regular.ttf',
        bold: '/usr/share/fonts/truetype/Carlito-Bold.ttf',
        italic: '/usr/share/fonts/truetype/Carlito-Italic.ttf',
      },
      {
        regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
      },
    ];

    let hasUnicodeFont = false;
    for (const fontPair of candidateFonts) {
      if (fs.existsSync(fontPair.regular) && fs.existsSync(fontPair.bold)) {
        try {
          doc.registerFont('AppRegular', fontPair.regular);
          doc.registerFont('AppBold', fontPair.bold);
          if (fontPair.italic && fs.existsSync(fontPair.italic)) {
            doc.registerFont('AppItalic', fontPair.italic);
          } else {
            doc.registerFont('AppItalic', fontPair.regular);
          }
          hasUnicodeFont = true;
          break;
        } catch {
          // Continue to next candidate
        }
      }
    }

    const setBold = () => doc.font(hasUnicodeFont ? 'AppBold' : 'Helvetica-Bold');
    const setRegular = () => doc.font(hasUnicodeFont ? 'AppRegular' : 'Helvetica');
    const setItalic = () => doc.font(hasUnicodeFont ? 'AppItalic' : 'Helvetica-Oblique');

    // Default font
    setRegular();

    // HEADER
    if (resume.contact) {
      setBold();
      doc.fontSize(20).text(resume.contact.name || '', { align: 'center' });
      doc.moveDown(0.3);

      setRegular();
      const contactInfo = [
        resume.contact.email,
        resume.contact.phone,
        ...(resume.contact.links || []),
      ].filter(Boolean).join('  |  ');
      doc.fontSize(9.5).text(contactInfo, { align: 'center' });
      doc.moveDown(0.8);
    }

    const renderSectionHeader = (title: string) => {
      doc.moveDown(0.5);
      setBold();
      doc.fontSize(11).text(title.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US'));
      const y = doc.y;
      doc.strokeColor('#333333').lineWidth(0.75).moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
      doc.moveDown(0.4);
    };

    // SUMMARY
    if (resume.summary) {
      renderSectionHeader(titles.summary);
      setRegular();
      doc.fontSize(9.5).text(resume.summary, { lineGap: 2 });
    }

    // EXPERIENCE
    if (resume.experience && resume.experience.length > 0) {
      renderSectionHeader(titles.experience);
      for (const exp of resume.experience) {
        const endDate = exp.endDate || presentText;
        setBold();
        doc.fontSize(10).text(exp.title, { continued: true });
        setItalic();
        doc.fontSize(9).text(`  -  ${exp.company} (${exp.startDate} - ${endDate})`, { align: 'left' });

        if (exp.description) {
          setRegular();
          doc.fontSize(9).text(exp.description, { lineGap: 1.5 });
        }

        if (exp.bullets) {
          setRegular();
          for (const bullet of exp.bullets) {
            doc.fontSize(9).text(`•  ${bullet}`, { indent: 12, lineGap: 1.5 });
          }
        }
        doc.moveDown(0.4);
      }
    }

    // EDUCATION
    if (resume.education && resume.education.length > 0) {
      renderSectionHeader(titles.education);
      for (const edu of resume.education) {
        const endDate = edu.endDate || presentText;
        setBold();
        doc.fontSize(10).text(edu.degree, { continued: true });
        setItalic();
        doc.fontSize(9).text(`  -  ${edu.institution} (${edu.startDate} - ${endDate})`, { align: 'left' });
        doc.moveDown(0.3);
      }
    }

    // SKILLS
    if (resume.skills && resume.skills.length > 0) {
      renderSectionHeader(titles.skills);
      setRegular();
      doc.fontSize(9.5).text(resume.skills.join(', '), { lineGap: 2 });
    }

    // PROJECTS
    if (resume.projects && resume.projects.length > 0) {
      renderSectionHeader(titles.projects);
      for (const proj of resume.projects) {
        setBold();
        doc.fontSize(10).text(proj.name, { continued: !!proj.link });
        if (proj.link) {
          setItalic();
          doc.fontSize(8.5).text(`  (${proj.link})`);
        }
        if (proj.description) {
          setRegular();
          doc.fontSize(9).text(proj.description, { lineGap: 1.5 });
        }
        doc.moveDown(0.3);
      }
    }

    doc.end();
  });
}
