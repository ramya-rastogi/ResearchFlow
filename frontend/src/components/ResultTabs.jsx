import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SourceBadge from './SourceBadge';
import { exportReportToPDF } from '../utils/pdfExport';
import { normalizeMarkdown } from '../utils/markdownUtils';
import {
  ShieldCheck,
  Award,
  Link2,
  AlertTriangle,
  Pin,
  Ban,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';

function ResultTabs({ job, result: propResult, scores: propScores, onRerunWithSteering }) {
  const [activeTab, setActiveTab] = useState('Report');
  const [downloading, setDownloading] = useState(false);

  const result = job?.result || propResult || {};
  const scores = job?.scores || propScores || {};
  const sources = job?.sources || result.sources || [];
  const revisions = result.revisions || [];
  const verification = result.verification || null;

  // Steering local state
  const [pinnedUrls, setPinnedUrls] = useState(job?.steering?.pinnedUrls || []);
  const [excludedUrls, setExcludedUrls] = useState(job?.steering?.excludedUrls || []);

  const trustScore = scores.trust_score ?? (result.revised_score ? result.revised_score * 10 : (result.initial_score ? result.initial_score * 10 : 0));
  const qualityScore = scores.quality_score ?? 0;
  const citationCoverage = scores.citation_coverage ?? (verification?.coverage_percentage ?? 0);

  const togglePin = (url) => {
    if (pinnedUrls.includes(url)) {
      setPinnedUrls(pinnedUrls.filter((u) => u !== url));
    } else {
      setPinnedUrls([...pinnedUrls, url]);
      setExcludedUrls(excludedUrls.filter((u) => u !== url));
    }
  };

  const toggleExclude = (url) => {
    if (excludedUrls.includes(url)) {
      setExcludedUrls(excludedUrls.filter((u) => u !== url));
    } else {
      setExcludedUrls([...excludedUrls, url]);
      setPinnedUrls(pinnedUrls.filter((u) => u !== url));
    }
  };

  const downloadPDF = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const topicTitle = job?.topic || 'Research Report';
      const rawMarkdown = result.final_report || result.revised_report || result.initial_report || '';
      const markdown = normalizeMarkdown(rawMarkdown);

      exportReportToPDF({
        topic: topicTitle,
        markdown,
        trustScore,
        qualityScore,
        citationCoverage,
      });
    } catch (err) {
      console.error('PDF export encountered an issue:', err);
    } finally {
      setTimeout(() => {
        setDownloading(false);
      }, 500);
    }
  };


  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  if (!result && !job) return null;

  return (
    <div className="mt-10 space-y-6">
      {/* Top Score Cards & Citation Coverage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Trust Score Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <ShieldCheck size={16} className="text-blue-600" />
              <span>Trust Score</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {trustScore}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Fact & source credibility check</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full border text-xs font-bold ${getScoreColor(trustScore)}`}>
            {trustScore >= 90 ? 'High Trust' : trustScore >= 70 ? 'Moderate' : 'Needs Review'}
          </div>
        </div>

        {/* Quality Score Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Award size={16} className="text-indigo-600" />
              <span>Quality Score</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {qualityScore}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Clarity, structure & coherence</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full border text-xs font-bold ${getScoreColor(qualityScore)}`}>
            {qualityScore >= 85 ? 'Excellent' : qualityScore >= 70 ? 'Good' : 'Basic'}
          </div>
        </div>

        {/* Citation Coverage Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Link2 size={16} className="text-emerald-600" />
              <span>Citation Coverage</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {citationCoverage}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {verification?.fabricated_citations?.length > 0 ? (
                <span className="text-rose-500 font-medium">
                  {verification.fabricated_citations.length} unverified link(s) detected
                </span>
              ) : (
                'All citations match scraped URLs'
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
            <span className="text-xs font-bold text-slate-700">{citationCoverage}%</span>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6">
            {['Report', 'Feedback', 'Sources', 'Raw Data'].map((t) => (
              <button
                key={t}
                className={`py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'Report' && (
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-600 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'Sources' && onRerunWithSteering && (
            <button
              onClick={() => onRerunWithSteering({ pinnedUrls, excludedUrls })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw size={14} />
              <span>Re-run with these settings</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {/* 1. Report Tab */}
          {activeTab === 'Report' && (
            <div id="report-content" className="space-y-4">
              {result.was_revised && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle size={15} className="text-amber-600" />
                  <span>This is a revised report improved after automated critic review.</span>
                </div>
              )}
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="table-responsive-wrapper my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-slate-50 border-b border-slate-200" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100/70 border-b border-slate-200" {...props} />
                    ),
                    tbody: ({ node, ...props }) => (
                      <tbody className="divide-y divide-slate-100 bg-white" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/50" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 align-top border-b border-slate-100" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        className="text-blue-600 hover:text-blue-800 underline font-medium break-all"
                        target="_blank"
                        rel="noreferrer"
                        {...props}
                      />
                    ),
                  }}
                >
                  {normalizeMarkdown(
                    result.final_report || result.revised_report || result.initial_report || 'No report generated yet.'
                  )}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 2. Feedback Tab with Revision Timeline */}
          {activeTab === 'Feedback' && (
            <div className="space-y-6">
              {revisions.length > 0 ? (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    <span>Revision Timeline ({revisions.length} Evaluation{revisions.length > 1 ? 's' : ''})</span>
                  </h3>
                  <div className="space-y-4">
                    {revisions.map((rev, idx) => (
                      <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded">
                            {rev.iteration === 0 ? 'Initial Review' : `Revision #${rev.iteration}`}
                          </span>
                          <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="text-emerald-700">Trust: {rev.score}/100</span>
                            {rev.quality_score !== undefined && (
                              <span className="text-indigo-700">Quality: {rev.quality_score}/100</span>
                            )}
                          </div>
                        </div>
                        <pre className="font-sans text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {rev.feedback}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.was_revised ? (
                    <>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Initial Feedback (Score: {result.initial_score}/10)
                        </h4>
                        <pre className="font-sans text-xs text-slate-700 whitespace-pre-wrap">
                          {result.initial_feedback || 'No initial feedback recorded.'}
                        </pre>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Revised Feedback (Score: {result.revised_score}/10)
                        </h4>
                        <pre className="font-sans text-xs text-slate-700 whitespace-pre-wrap">
                          {result.revised_feedback || 'No revision feedback recorded.'}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Critic Feedback (Score: {result.initial_score ?? trustScore / 10}/10)
                      </h4>
                      <pre className="font-sans text-xs text-slate-700 whitespace-pre-wrap">
                        {result.initial_feedback || 'No feedback available.'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Sources Tab with Tier Badges + Scrape Status + Pin/Exclude Controls */}
          {activeTab === 'Sources' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 mb-2">
                Pin authoritative sources to scrape them first, or exclude untrusted domains. Click "Re-run with these settings" to trigger a targeted update.
              </div>
              {sources.length === 0 ? (
                <p className="text-sm text-slate-500">No sources found.</p>
              ) : (
                sources.map((src, i) => {
                  const isPinned = pinnedUrls.includes(src.url);
                  const isExcluded = excludedUrls.includes(src.url);

                  return (
                    <div
                      key={src.url || i}
                      className={`p-4 rounded-xl border transition-all ${
                        isExcluded
                          ? 'border-rose-200 bg-rose-50/40 opacity-70'
                          : isPinned
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 break-all"
                          >
                            {src.url}
                          </a>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <SourceBadge tier={src.tier || 'unknown'} />
                            <span className="text-xs text-slate-500">
                              {src.label} {src.reason ? `— ${src.reason}` : ''}
                            </span>
                            {/* Scrape status */}
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                src.status === 'scraped'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : src.status === 'failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {src.status || 'pending'}
                            </span>
                          </div>
                        </div>

                        {/* Pin and Exclude Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => togglePin(src.url)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors ${
                              isPinned
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <Pin size={12} />
                            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                          </button>
                          <button
                            onClick={() => toggleExclude(src.url)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors ${
                              isExcluded
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <Ban size={12} />
                            <span>{isExcluded ? 'Excluded' : 'Exclude'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 4. Raw Data Tab */}
          {activeTab === 'Raw Data' && (
            <div className="space-y-6 text-xs text-slate-600 font-mono">
              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">
                  Raw Search Results
                </h4>
                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {result.search_results || 'No search results available.'}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">
                  Raw Scraped Content
                </h4>
                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
                  {result.scraped_content || 'No scraped content available.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultTabs;
