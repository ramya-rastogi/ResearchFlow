import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck } from 'lucide-react';

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50/70 text-slate-600">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Purpose (spans 2 columns) */}
          <div className="md:col-span-2 space-y-3.5">
            <Link to="/" className="inline-flex items-center gap-2.5 font-bold text-slate-900 text-lg tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles size={16} />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ResearchFlow
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              An autonomous research platform that investigates complex topics, validates real-world web sources, and produces publication-ready reports with verified citations.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>All research agents operational</span>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Workspace
            </h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link to="/research" className="hover:text-blue-600 transition-colors">
                  New Investigation
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-blue-600 transition-colors">
                  Saved Reports & Audits
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-600 transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Verification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Verification
            </h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                <span>Deterministic Fact-Checking</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                <span>Source Tier Scoring</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                <span>Automated Critic Review</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-bar */}
      <div className="border-t border-slate-200/80 bg-white py-5">
        <div className="max-w-6xl mx-auto px-6 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} ResearchFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
