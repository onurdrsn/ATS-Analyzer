import { create } from 'zustand';
import type { BatchAnalysisResponse, BatchJobItem } from '@ats-analyzer/contracts';

export interface BatchJobEntry {
  id: string;
  jobTitle?: string;
  company?: string;
  jobUrl: string;
  jobText: string;
  activeInputType: 'url' | 'text';
}

export interface BatchState {
  jobs: BatchJobEntry[];
  results: BatchAnalysisResponse | null;
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  addJob: () => boolean;
  removeJob: (id: string) => boolean;
  updateJob: (id: string, partial: Partial<BatchJobEntry>) => void;
  setResults: (results: BatchAnalysisResponse | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  getSubmissionPayload: () => BatchJobItem[];
}

let nextId = 2;

export const createInitialJob = (id = 'job-1'): BatchJobEntry => ({
  id,
  jobTitle: '',
  company: '',
  jobUrl: '',
  jobText: '',
  activeInputType: 'text',
});

export const useBatchStore = create<BatchState>((set, get) => ({
  jobs: [createInitialJob('job-1')],
  results: null,
  isAnalyzing: false,
  error: null,

  addJob: () => {
    const { jobs } = get();
    if (jobs.length >= 5) {
      return false;
    }
    const newJob = createInitialJob(`job-${nextId++}`);
    set({ jobs: [...jobs, newJob] });
    return true;
  },

  removeJob: (id: string) => {
    const { jobs } = get();
    if (jobs.length <= 1) {
      return false;
    }
    set({ jobs: jobs.filter((j) => j.id !== id) });
    return true;
  },

  updateJob: (id: string, partial: Partial<BatchJobEntry>) => {
    const { jobs } = get();
    set({
      jobs: jobs.map((j) => (j.id === id ? { ...j, ...partial } : j)),
    });
  },

  setResults: (results: BatchAnalysisResponse | null) => {
    set({ results });
  },

  setIsAnalyzing: (isAnalyzing: boolean) => {
    set({ isAnalyzing });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    nextId = 2;
    set({
      jobs: [createInitialJob('job-1')],
      results: null,
      isAnalyzing: false,
      error: null,
    });
  },

  getSubmissionPayload: () => {
    const { jobs } = get();
    return jobs.map((job) => {
      const item: BatchJobItem = {};
      if (job.jobTitle?.trim()) item.jobTitle = job.jobTitle.trim();
      if (job.company?.trim()) item.company = job.company.trim();

      if (job.activeInputType === 'url') {
        if (job.jobUrl.trim()) {
          item.jobUrl = job.jobUrl.trim();
        }
        if (job.jobText.trim()) {
          item.jobText = job.jobText.trim();
        }
      } else {
        if (job.jobText.trim()) {
          item.jobText = job.jobText.trim();
        }
        if (job.jobUrl.trim()) {
          item.jobUrl = job.jobUrl.trim();
        }
      }
      return item;
    });
  },
}));
