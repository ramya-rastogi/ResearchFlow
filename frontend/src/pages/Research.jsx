import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResearch } from '../context/ResearchContext';
import PipelineTracker from '../components/PipelineTracker';
import ExampleChips from '../components/ExampleChips';
import ResultTabs from '../components/ResultTabs';
import LiveEventStream from '../components/LiveEventStream';
import {
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle,
  ShieldCheck,
  FileText,
  RotateCcw
} from 'lucide-react';

function Research() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    jobId,
    setJobId,
    job,
    topic,
    setTopic,
    isRunning,
    startNewResearch,
    clearActiveJob,
  } = useResearch();

  // When job state is passed from history navigation
  useEffect(() => {
    if (location.state?.jobId && location.state.jobId !== jobId) {
      setJobId(location.state.jobId);
    }
  }, [location.state?.jobId, jobId, setJobId]);

  const handleStart = async (topicToUse = topic, options = {}) => {
    const query = topicToUse.trim();
    if (!query || isRunning) return;

    try {
      await startNewResearch(query, options);
    } catch (err) {
      console.error('Error starting research:', err);
    }
  };

  const handleRerunWithSteering = async ({ pinnedUrls, excludedUrls }) => {
    const topicToUse = topic || job?.topic;
    if (!topicToUse) return;
    await handleStart(topicToUse, { pinnedUrls, excludedUrls });
  };

  const isFailed = job?.status === 'failed';
  const isCompleted = job?.status === 'completed';

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Workspace Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Research Workspace
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Input a research topic to start our multi-agent pipeline with parallel web scraping, inline citation grounding, and automated quality auditing.
          </p>
        </div>

        {/* Input Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-md">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-medium transition-all"
                placeholder="e.g. Advancements in Solid-State Lithium Batteries 2026"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                disabled={isRunning}
              />
            </div>
            <button
              onClick={() => handleStart()}
              disabled={!topic.trim() || isRunning}
              className="px-6 py-3 sm:py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <span>Begin Research</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            {job && !isRunning && (
              <button
                type="button"
                onClick={clearActiveJob}
                title="Clear current workspace and start fresh"
                className="px-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>New Topic</span>
              </button>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <ExampleChips onSelect={(chipTopic) => {
              setTopic(chipTopic);
              handleStart(chipTopic);
            }} />
          </div>
        </div>

        {/* Visible Error Panel */}
        {isFailed && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} className="text-rose-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-rose-900">Research Run Failed</h3>
                <p className="text-xs sm:text-sm text-rose-700 mt-0.5">
                  The multi-agent pipeline encountered an issue. Inspect the execution logs below or retry.
                </p>
              </div>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => handleStart()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Retry Research</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Pipeline Tracker */}
        {job && (
          <PipelineTracker
            currentStep={job.step}
            wasRevised={job.result?.was_revised}
          />
        )}

        {/* Live Terminal Event Stream */}
        {job && job.logs && job.logs.length > 0 && (
          <LiveEventStream logs={job.logs} />
        )}

        {/* Results View */}
        {job && (isCompleted || job.result?.final_report) && (
          <ResultTabs
            job={job}
            onRerunWithSteering={handleRerunWithSteering}
          />
        )}
      </div>
    </div>
  );
}

export default Research;
