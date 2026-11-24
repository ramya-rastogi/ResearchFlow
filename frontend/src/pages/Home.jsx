import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  ShieldCheck,
  FileText,
  Layers,
  Sliders,
  Database,
  RotateCcw
} from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen pt-20 flex flex-col bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        {/* Subtle Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-blue-100/60 via-indigo-50/50 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <motion.div
              className="lg:col-span-7 space-y-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Autonomous Research <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  with Verified Citations
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
                Conduct thorough multi-source web investigations with LangGraph orchestration.
                Every generated claim is verified against scraped sources with strict deterministic citation checks.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 items-center">
                <Link
                  to="/research"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all transform hover:-translate-y-0.5"
                >
                  <span className="text-white font-medium">Start Workspace</span>
                  <ArrowRight size={18} className="text-white" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-base shadow-xs transition-all"
                >
                  <BookOpen size={16} />
                  <span>Documentation</span>
                </Link>
              </div>
            </motion.div>

            {/* Right Visual Graphic */}
            <motion.div
              className="lg:col-span-5 relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            >
              <div className="relative mx-auto max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      5 ACTIVE AGENTS
                    </span>
                  </div>
                </div>

                {/* Simulated Workflow steps with all 5 agents */}
                <div className="space-y-2.5 font-mono text-xs">
                  {/* 1. SearchAgent */}
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-blue-950 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Search size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">SearchAgent</span>
                        <span className="text-[10px] text-slate-500 font-sans">Dual Tavily Queries</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded font-bold">2 QUERIES</span>
                  </div>

                  {/* 2. ReaderAgent */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-emerald-950 hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Layers size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">ReaderAgent</span>
                        <span className="text-[10px] text-slate-500 font-sans">Parallel Web Extraction</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded font-bold">5 SOURCES</span>
                  </div>

                  {/* 3. WriterAgent */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-indigo-950 hover:bg-indigo-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">WriterAgent</span>
                        <span className="text-[10px] text-slate-500 font-sans">Structured Synthesis</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded font-bold">INLINE CITED</span>
                  </div>

                  {/* 4. CriticAgent */}
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between text-amber-950 hover:bg-amber-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">CriticAgent</span>
                        <span className="text-[10px] text-slate-500 font-sans">Deterministic Audit</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded font-bold">SCORE: 92/100</span>
                  </div>

                  {/* 5. ReviserAgent */}
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-purple-950 hover:bg-purple-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <RotateCcw size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">ReviserAgent</span>
                        <span className="text-[10px] text-slate-500 font-sans">Self-Correction Loop</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded font-bold">LOOP REVISE</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              How the Multi-Agent Flow Works
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              A state-machine pipeline engineered with LangGraph to systematically gather, scrape, draft, and audit research reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                step: '01',
                title: 'Parallel Search',
                desc: 'Executes concurrent queries via Tavily including current year synthesis and custom exclusions.',
                icon: Search,
              },
              {
                step: '02',
                title: 'Multi-Source Scrape',
                desc: 'Concurrently scrapes candidate pages, filtering out low-content pages and applying retry backoff.',
                icon: Layers,
              },
              {
                step: '03',
                title: 'Grounded Writing',
                desc: 'Drafts structured Summary, Key Findings, and Conclusion with strict inline URL citations.',
                icon: FileText,
              },
              {
                step: '04',
                title: 'Fact Audit',
                desc: 'Deterministic Python check extracts cited URLs, detects fabricated links, and scores citation coverage.',
                icon: ShieldCheck,
              },
              {
                step: '05',
                title: 'Targeted Revision',
                desc: 'If score is below threshold, routes through revision loop until quality standards or limit is reached.',
                icon: Sliders,
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 relative flex flex-col justify-between hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                      {item.step}
                    </span>
                    <item.icon size={20} className="text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Engineered for Research Integrity
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Designed with verifiable checks rather than blind LLM trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Deterministic Citation Audit</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Extracts inline citations in Python, cross-references with scraped domains, and automatically penalizes trust scores if unverified links are present.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
                <Sliders size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Interactive Steering</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pin preferred authoritative sources to prioritize them first or exclude unwanted domains before re-running a targeted research cycle.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <Database size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Resilient Persistence</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Unified repository abstraction connects to PostgreSQL for long-term job history and falls back gracefully to in-memory mode when offline.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
