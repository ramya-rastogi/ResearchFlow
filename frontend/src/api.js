import { useState, useEffect } from 'react';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

/**
 * Shared job mapper to ensure consistent field names across all components.
 * @param {any} raw
 * @returns {any}
 */
export const normalizeJob = (raw) => {
  if (!raw) return null;

  const jobId = raw.job_id || raw.id || raw.jobId || '';
  const results = raw.results || raw.result || {};
  const scores = raw.scores || {};
  const rawSources = raw.sources || results.sources || [];
  const revisions = results.revisions || [];
  const wasRevised = Boolean(
    results.was_revised ||
    (revisions && revisions.length > 1) ||
    results.revised_report
  );

  const trustScore = scores.trust_score ?? (results.revised_score ? results.revised_score * 10 : (results.initial_score ? results.initial_score * 10 : 0));
  const qualityScore = scores.quality_score ?? 0;
  const finalScore10 = scores.final_score ?? (results.was_revised ? results.revised_score : results.initial_score ?? 0);
  const citationCoverage = scores.citation_coverage ?? (results.verification?.coverage_percentage ?? 0);

  return {
    job_id: jobId,
    id: jobId,
    topic: raw.topic || '',
    status: raw.status || 'running',
    step: raw.step || 'pending',
    result: {
      initial_report: results.initial_report || null,
      initial_score: results.initial_score ?? null,
      initial_feedback: results.initial_feedback || null,
      revised_report: results.revised_report || null,
      revised_score: results.revised_score ?? null,
      revised_feedback: results.revised_feedback || null,
      final_report: results.final_report || results.report || results.initial_report || null,
      was_revised: wasRevised,
      sources: rawSources,
      search_results: results.search_results || raw.search_results || '',
      scraped_content: results.scraped_content || raw.scraped_content || '',
      revisions: revisions,
      verification: results.verification || null,
    },
    scores: {
      trust_score: trustScore,
      quality_score: qualityScore,
      final_score: finalScore10,
      citation_coverage: citationCoverage,
    },
    sources: rawSources,
    steering: raw.steering || { pinnedUrls: [], excludedUrls: [] },
    logs: raw.logs || [],
    created_at: raw.created_at || Date.now() / 1000,
    updated_at: raw.updated_at || Date.now() / 1000,
  };
};

export const startResearch = async (topic, options = {}) => {
  const { pinnedUrls = [], excludedUrls = [] } = options;
  const res = await fetch(`${API_BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      pinnedUrls,
      excludedUrls,
    }),
  });
  const data = await res.json();
  return normalizeJob(data);
};

export const getJobStatus = async (jobId) => {
  const res = await fetch(`${API_BASE}/research/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch job (${res.status})`);
  }
  const data = await res.json();
  return normalizeJob(data);
};

export const steerJob = async (jobId, { pinnedUrls = [], excludedUrls = [] }) => {
  const res = await fetch(`${API_BASE}/research/${jobId}/steer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinnedUrls, excludedUrls }),
  });
  return res.json();
};

export const getHistory = async () => {
  const res = await fetch(`${API_BASE}/history`);
  const data = await res.json();
  return data.map((item) => ({
    ...item,
    job_id: item.job_id || item.id,
  }));
};

export const clearHistory = async () => {
  const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  return res.json();
};

export const usePollJob = (jobId) => {
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    let isSubscribed = true;
    let pollInterval = null;
    let eventSource = null;

    const startPollingFallback = () => {
      if (pollInterval) return;
      const poll = async () => {
        try {
          const data = await getJobStatus(jobId);
          if (isSubscribed) {
            setJob(data);
            if (data.status !== 'running') {
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      };
      poll();
      pollInterval = setInterval(poll, 1000);
    };

    // Try EventSource SSE first
    try {
      eventSource = new EventSource(`${API_BASE}/research/${jobId}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (isSubscribed) {
            setJob((prev) => {
              // Merge partial updates into state if needed
              if (prev && raw.status === undefined && raw.logs) {
                const combinedLogs = [...(prev.logs || []), ...raw.logs];
                const updated = {
                  ...prev,
                  step: raw.step || prev.step,
                  logs: combinedLogs,
                  sources: raw.sources || prev.sources,
                  scores: { ...prev.scores, ...(raw.scores || {}) },
                  result: { ...prev.result, ...(raw.results || raw.result || {}) },
                };
                return normalizeJob(updated);
              }
              return normalizeJob(raw);
            });

            if (raw.status === 'completed' || raw.status === 'failed') {
              eventSource?.close();
            }
          }
        } catch (parseErr) {
          console.error('Error parsing SSE event:', parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE stream closed or error encountered, falling back to 1s polling.', err);
        eventSource?.close();
        eventSource = null;
        startPollingFallback();
      };
    } catch (e) {
      console.warn('SSE not supported or failed to initialize, starting polling.', e);
      startPollingFallback();
    }

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId]);

  return job;
};
