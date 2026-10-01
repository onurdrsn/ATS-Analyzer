import type { BatchJobEntry } from '../store/batchStore';

export function isValidHttpUrl(string: string): boolean {
  if (!string || string.trim().length === 0) return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateJobEntry(job: BatchJobEntry): { isValid: boolean; error?: string } {
  if (job.activeInputType === 'url') {
    if (!job.jobUrl.trim()) {
      return { isValid: false, error: 'URL is required' };
    }
    if (!isValidHttpUrl(job.jobUrl)) {
      return { isValid: false, error: 'invalidUrl' };
    }
    return { isValid: true };
  } else {
    if (!job.jobText.trim()) {
      return { isValid: false, error: 'Text is required' };
    }
    if (job.jobText.trim().length < 50) {
      return { isValid: false, error: 'textTooShort' };
    }
    return { isValid: true };
  }
}
