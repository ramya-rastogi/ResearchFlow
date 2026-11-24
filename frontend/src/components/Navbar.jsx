import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useResearch } from '../context/ResearchContext';
import { Sparkles, Search, Clock, Info } from 'lucide-react';

function Navbar() {
  const { isRunning } = useResearch();

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-8 px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all max-w-4xl w-full">
        <Link to="/" className="flex items-center gap-2 group font-bold text-slate-900 tracking-tight text-lg">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles size={16} />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ResearchFlow
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/research"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`
            }
          >
            <Search size={14} />
            <span>Workspace</span>
            {isRunning && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`
            }
          >
            <Clock size={14} />
            <span>History</span>
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`
            }
          >
            <Info size={14} />
            <span>About</span>
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
