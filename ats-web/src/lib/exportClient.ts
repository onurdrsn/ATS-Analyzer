import { saveAs } from 'file-saver';
import {
  type Language,
  type ExportFormat,
  type StructuredResume,
} from '@ats-analyzer/contracts';
import { generateAndDownloadPDF } from './export';
import { generateLatexSource } from './latexGenerator';
import { generateWordHtmlDocument } from './docxFallback';

export interface ExportResumeOptions {
  resumeData: StructuredResume;
  format: ExportFormat;
  language: Language;
  filename?: string;
}

export async function exportResume({
  resumeData,
  format,
  language,
  filename,
}: ExportResumeOptions): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const candidateName = resumeData.contact?.name?.trim().replace(/\s+/g, '_') || 'Resume';
  const extension = format === 'tex' ? 'tex' : format;
  const defaultFilename = filename || `${candidateName}_ATS_${language.toUpperCase()}.${extension}`;

  // 1. Primary: Server-side API endpoint POST /api/export
  try {
    const res = await fetch(`${apiUrl}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeData,
        format,
        language,
        filename: defaultFilename,
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      saveAs(blob, defaultFilename);
      return;
    }
    console.warn(`Server export returned status ${res.status}; falling back to client-side generation.`);
  } catch (error) {
    console.warn('Backend export endpoint unavailable; switching to client-side generator.', error);
  }

  // 2. Client-side Fallback
  if (format === 'pdf') {
    await generateAndDownloadPDF(resumeData, defaultFilename, language);
  } else if (format === 'tex') {
    const texContent = generateLatexSource(resumeData, language);
    const blob = new Blob([texContent], { type: 'application/x-tex;charset=utf-8' });
    saveAs(blob, defaultFilename);
  } else if (format === 'docx') {
    const docHtml = generateWordHtmlDocument(resumeData, language);
    const blob = new Blob([docHtml], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8',
    });
    saveAs(blob, defaultFilename);
  }
}
