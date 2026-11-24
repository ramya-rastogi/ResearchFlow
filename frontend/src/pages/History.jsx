import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, clearHistory } from '../api';
import ScoreBadge from '../components/ScoreBadge';
import { Clock, Trash2, ArrowRight, Layers, AlertCircle } from 'lucide-react';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Could not load past runs. Verify that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear research history?')) return;
    try {
      await clearHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Clock size={16} className="text-blue-600" />
              <span>Audit Trail</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Past Research Runs
            </h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Loading past research history...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && history.length === 0 && (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Layers size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Research Runs Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Start a new research investigation in the workspace to view historical audits and reports here.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/research')}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <span>Go to Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* List of Runs */}
        {!loading && history.length > 0 && (
          <div className="space-y-3">
            {history.map((h) => {
              const jobId = h.job_id || h.id;
              const dateStr = h.created_at
                ? new Date(h.created_at * (h.created_at < 1e11 ? 1000 : 1)).toLocaleString()
                : 'Recent';

              return (
                <div
                  key={jobId}
                  onClick={() => navigate('/research', { state: { jobId } })}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {h.topic}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span className={`capitalize font-sans px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        h.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    {h.was_revised && (
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                        Revised
                      </span>
                    )}
                    <ScoreBadge score={h.final_score} />
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
