import React, { useRef, useEffect } from 'react';
import { Terminal, ExternalLink } from 'lucide-react';

function LiveEventStream({ logs = [] }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs || logs.length === 0) return null;

  const getTypeStyle = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-400 bg-red-950/40 border-red-800/50';
      case 'warning':
        return 'text-amber-300 bg-amber-950/40 border-amber-800/50';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
      default:
        return 'text-sky-300 bg-sky-950/40 border-sky-800/50';
    }
  };

  return (
    <div className="mt-8 rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-400" />
          <span className="font-semibold text-slate-300 tracking-wide uppercase text-[11px]">
            Live Execution Stream
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">STREAM ACTIVE</span>
        </div>
      </div>

      {/* Terminal Body */}
      <div ref={scrollRef} className="p-4 max-h-72 overflow-y-auto space-y-2.5 text-slate-300 scroll-smooth">
        {logs.map((log, idx) => {
          const timeStr = log.timestamp
            ? new Date(log.timestamp * (log.timestamp < 1e11 ? 1000 : 1)).toLocaleTimeString()
            : new Date().toLocaleTimeString();

          return (
            <div key={log.id || idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-slate-500 select-none shrink-0 font-light">[{timeStr}]</span>
              <span className="text-slate-400 font-bold shrink-0">[{log.agent || 'System'}]</span>
              <span className={`px-1.5 py-0.2 rounded border text-[10px] uppercase font-bold shrink-0 ${getTypeStyle(log.type)}`}>
                {log.type || 'info'}
              </span>
              <span className="text-slate-200 break-words flex-1">{log.message}</span>
              {log.source_url && (
                <a
                  href={log.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 shrink-0 underline ml-1 max-w-[180px] truncate"
                  title={log.source_url}
                >
                  <ExternalLink size={11} />
                  <span>source</span>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveEventStream;
