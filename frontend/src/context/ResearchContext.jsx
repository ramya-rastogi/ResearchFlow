import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { startResearch, getJobStatus, usePollJob } from '../api';

const ACTIVE_JOB_KEY = 'researchflow_active_job_id';

const ResearchContext = createContext(null);

export const ResearchProvider = ({ children }) => {
  const [jobId, setJobIdState] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_JOB_KEY) || null;
    } catch {
      return null;
    }
  });

  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [optimisticRunning, setOptimisticRunning] = useState(false);

  const job = usePollJob(jobId);

  // Sync active jobId to localStorage
  const setJobId = useCallback((newId) => {
    setJobIdState(newId);
    try {
      if (newId) {
        localStorage.setItem(ACTIVE_JOB_KEY, newId);
      } else {
        localStorage.removeItem(ACTIVE_JOB_KEY);
      }
    } catch (e) {
      console.warn('Could not access localStorage:', e);
    }
  }, []);

  // When job terminates (completed or failed), clear optimistic running
  useEffect(() => {
    if (job?.status && job.status !== 'running') {
      setOptimisticRunning(false);
    }
  }, [job?.status]);

  // Sync topic with current job once loaded
  useEffect(() => {
    if (job?.topic && !topic) {
      setTopic(job.topic);
    }
  }, [job?.topic]);

  // If stored job returns 404 or fails permanently on startup, clear it gracefully
  useEffect(() => {
    if (!jobId) return;
    getJobStatus(jobId).catch((err) => {
      if (err.message && err.message.includes('404')) {
        console.warn('Active job no longer exists on backend, clearing cache.');
        setJobId(null);
      }
    });
  }, [jobId, setJobId]);

  const startNewResearch = useCallback(async (query, options = {}) => {
    const trimmed = (query || '').trim();
    if (!trimmed || submitting || optimisticRunning || job?.status === 'running') return null;

    setSubmitting(true);
    setOptimisticRunning(true);
    try {
      const res = await startResearch(trimmed, options);
      if (res?.job_id) {
        setJobId(res.job_id);
        setTopic(trimmed);
        return res;
      }
    } catch (err) {
      console.error('Error starting research:', err);
      setOptimisticRunning(false);
      throw err;
    } finally {
      setSubmitting(false);
    }
    return null;
  }, [submitting, optimisticRunning, job?.status, setJobId]);

  const clearActiveJob = useCallback(() => {
    setJobId(null);
    setTopic('');
    setOptimisticRunning(false);
  }, [setJobId]);

  const isRunning = Boolean(job?.status === 'running' || submitting || optimisticRunning);

  return (
    <ResearchContext.Provider
      value={{
        jobId,
        setJobId,
        job,
        topic,
        setTopic,
        submitting,
        isRunning,
        startNewResearch,
        clearActiveJob,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = () => {
  const ctx = useContext(ResearchContext);
  if (!ctx) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return ctx;
};
