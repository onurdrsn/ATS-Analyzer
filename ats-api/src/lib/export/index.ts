import {
  EXPORT_MIME_TYPES,
  type ExportResumeRequest,
} from '@ats-analyzer/contracts';
import { generateLatexResume } from './latex.js';
import { generateDocxResume } from './docx.js';
import { generatePdfResume } from './pdf.js';

export { generateLatexResume, generateDocxResume, generatePdfResume };
export * from './utils.js';

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  asciiFilename: string;
  encodedFilename: string;
}

export async function exportResumeDocument(request: ExportResumeRequest): Promise<ExportResult> {
  const { resumeData, format, language } = request;
  const extension = format === 'tex' ? 'tex' : format;
  const nameBase = resumeData.contact?.name ? resumeData.contact.name.trim().replace(/\s+/g, '_') : 'resume';
  const rawFilename = request.filename || `${nameBase}_${language}.${extension}`;

  const asciiFilename = rawFilename
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const encodedFilename = encodeURIComponent(rawFilename).replace(/'/g, '%27');

  let buffer: Buffer;
  let mimeType: string = EXPORT_MIME_TYPES[format] || 'application/octet-stream';

  switch (format) {
    case 'tex': {
      const texString = generateLatexResume(resumeData, language);
      buffer = Buffer.from(texString, 'utf-8');
      mimeType = EXPORT_MIME_TYPES.tex;
      break;
    }
    case 'docx': {
      buffer = await generateDocxResume(resumeData, language);
      mimeType = EXPORT_MIME_TYPES.docx;
      break;
    }
    case 'pdf': {
      buffer = await generatePdfResume(resumeData, language);
      mimeType = EXPORT_MIME_TYPES.pdf;
      break;
    }
  }

  return { buffer, mimeType, asciiFilename, encodedFilename };
}
