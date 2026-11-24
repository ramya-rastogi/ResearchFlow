import React from 'react';
import { ShieldCheck, Layers, GitBranch, Database, CheckCircle, Terminal } from 'lucide-react';

function About() {
  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <span>System Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            About ResearchFlow
          </h1>
          <p className="text-slate-600 text-base mt-2">
            An open multi-agent research workflow built with LangGraph, FastAPI, and React.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="text-blue-600" size={20} />
              <span>Orchestration with LangGraph</span>
            </h2>
            <p>
              ResearchFlow uses a cyclical state graph defined in <code>LangGraph</code>. Instead of a rigid linear pipeline, the system models research as an autonomous state machine composed of 5 distinct asynchronous nodes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Search Node:</strong> Fires parallel search queries with Tavily (the query itself plus current-year synthesis), merges results, applies user-defined domain exclusions, prioritizes pinned sources, and deduplicates the top 5 URLs.
              </li>
              <li>
                <strong>Scrape Node:</strong> Concurrently scrapes candidate pages via HTTP, strips script/style/nav/footer tags, discards short pages under 100 characters, and tracks individual source status.
              </li>
              <li>
                <strong>Write Node:</strong> Synthesizes scraped documents into a structured report (Summary, Key Findings, Conclusion) while enforcing inline URL citations from the scraped sources.
              </li>
              <li>
                <strong>Critic Node:</strong> Acts as a skeptical quality auditor. Evaluates the draft for structure and combines model scores with a deterministic citation verification formula.
              </li>
              <li>
                <strong>Revise Node:</strong> Iteratively rewrites the report to fix identified issues and remove unsupported claims if the trust score is below the configured threshold (default: 90), bounded by a maximum revision limit (default: 2).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} />
              <span>Deterministic Citation Verification</span>
            </h2>
            <p>
              Rather than trusting the LLM to grade itself in isolation, ResearchFlow executes a deterministic Python audit following each write and revise step:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Extracts all inline URLs referenced in the report.</li>
              <li>Compares each cited URL against the set of successfully scraped web sources.</li>
              <li>Flags any cited URL not in the scraped set as an unverified/fabricated citation.</li>
              <li>Calculates <em>citation coverage</em> (the percentage of factual sentences that carry a valid citation).</li>
              <li>Applies a deterministic formula deducting points for unverified citations and missing coverage.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="text-indigo-600" size={20} />
              <span>Live Streaming & User Steering</span>
            </h2>
            <p>
              Execution updates are streamed in real time to the browser via Server-Sent Events (<code>/api/research/:id/stream</code>) with automatic fallback to polling. Users can dynamically steer the pipeline by pinning authoritative sources to scrape first or excluding unwanted domains.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="text-amber-600" size={20} />
              <span>Persistence & Model Flexibility</span>
            </h2>
            <p>
              Job history and detailed execution logs are backed by a unified <code>JobRepository</code>. When PostgreSQL is available, records persist across backend restarts; if PostgreSQL is offline, the backend seamlessly falls back to an in-memory store without failing. The LLM provider is configurable for either Mistral AI or Groq.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default About;
