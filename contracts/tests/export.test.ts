import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ExportFormatSchema,
  EXPORT_FORMATS,
  EXPORT_MIME_TYPES,
  ExportResumeRequestSchema,
} from '../src/schemas/export.schema.js';

const mockResume = {
  contact: { name: 'Jane Doe', email: 'jane@example.com' },
  summary: 'Summary text',
  experience: [],
  education: [],
  skills: ['TypeScript'],
  projects: [],
};

describe('ExportFormatSchema & MIME Types', () => {
  it('TC-EXP-01: accepts "pdf" format', () => {
    assert.equal(ExportFormatSchema.parse('pdf'), 'pdf');
  });

  it('TC-EXP-02: accepts "docx" format', () => {
    assert.equal(ExportFormatSchema.parse('docx'), 'docx');
  });

  it('TC-EXP-03: accepts "tex" format', () => {
    assert.equal(ExportFormatSchema.parse('tex'), 'tex');
  });

  it('TC-EXP-04: rejects invalid export formats ("html", "markdown", "txt")', () => {
    assert.throws(() => ExportFormatSchema.parse('html'), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse('markdown'), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse('txt'), /Invalid enum value/);
  });

  it('TC-EXP-05: rejects uppercase formats ("PDF", "DOCX", "TEX")', () => {
    assert.throws(() => ExportFormatSchema.parse('PDF'), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse('DOCX'), /Invalid enum value/);
    assert.throws(() => ExportFormatSchema.parse('TEX'), /Invalid enum value/);
  });

  it('TC-EXP-06: exports array of valid formats', () => {
    assert.deepEqual(EXPORT_FORMATS, ['pdf', 'docx', 'tex']);
  });

  it('TC-EXP-07: provides valid IANA MIME types for all formats', () => {
    assert.equal(EXPORT_MIME_TYPES.pdf, 'application/pdf');
    assert.equal(
      EXPORT_MIME_TYPES.docx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    assert.equal(EXPORT_MIME_TYPES.tex, 'application/x-tex');
  });
});

describe('ExportResumeRequestSchema', () => {
  it('TC-EXPREQ-01: accepts valid PDF export request with default language', () => {
    const payload = {
      resumeData: mockResume,
      format: 'pdf',
    };
    const parsed = ExportResumeRequestSchema.parse(payload);
    assert.equal(parsed.format, 'pdf');
    assert.equal(parsed.language, 'en');
  });

  it('TC-EXPREQ-02: accepts valid DOCX export request with Turkish language', () => {
    const payload = {
      resumeData: mockResume,
      format: 'docx',
      language: 'tr',
    };
    const parsed = ExportResumeRequestSchema.parse(payload);
    assert.equal(parsed.format, 'docx');
    assert.equal(parsed.language, 'tr');
  });

  it('TC-EXPREQ-03: accepts valid LaTeX (.tex) export request', () => {
    const payload = {
      resumeData: mockResume,
      format: 'tex',
      language: 'en',
    };
    const parsed = ExportResumeRequestSchema.parse(payload);
    assert.equal(parsed.format, 'tex');
  });

  it('TC-EXPREQ-04: rejects request with missing resumeData', () => {
    assert.throws(() => ExportResumeRequestSchema.parse({ format: 'pdf' }));
  });

  it('TC-EXPREQ-05: rejects request with invalid format', () => {
    assert.throws(() =>
      ExportResumeRequestSchema.parse({
        resumeData: mockResume,
        format: 'rtf',
      })
    );
  });
});
