import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, AlertTriangle, Shield, Flame, Activity } from 'lucide-react';

const IntelBrief = ({ intelBrief, onDismiss }) => {
  if (!intelBrief) return null;

  const { severity, priority, description, timestamp } = intelBrief;

  // Color mapping based on severity
  const getSeverityColor = (sev) => {
    if (sev >= 80) return { bar: 'bg-red-500', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' };
    if (sev >= 50) return { bar: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' };
  };

  const getPriorityBadge = (p) => {
    switch (p?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      default:
        return 'bg-purple-50 text-purple-600 border-purple-200';
    }
  };

  const getRecommendedGear = (desc) => {
    const lower = (desc || '').toLowerCase();
    if (lower.includes('fire') || lower.includes('smoke') || lower.includes('fuel')) {
      return '🔥 Thermal Scanners & Fire Suppression Kit';
    }
    if (lower.includes('medical') || lower.includes('injur') || lower.includes('bleed') || lower.includes('collision')) {
      return '🏥 First Aid Kit & Thermal Scanners';
    }
    if (lower.includes('crime') || lower.includes('weapon') || lower.includes('armed') || lower.includes('theft')) {
      return '🛡️ Spotlight, Loudspeaker & Evidence Camera';
    }
    return '📦 Standard Response Package';
  };

  const sevColors = getSeverityColor(severity);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed bottom-6 right-6 z-[90] w-[380px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/10`}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${sevColors.bar}`} />

        {/* Header */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-[10px] font-black text-[#1A1A2E] uppercase tracking-widest">
              Mission Intelligence Brief
            </span>
          </div>
          <button 
            onClick={onDismiss}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        </div>

        {/* Timestamp */}
        <div className="px-6 pb-4">
          <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">
            Intel Received: {timestamp}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 mx-6" />

        {/* Incident Summary */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">Incident Summary</span>
          </div>
          <p className="text-[13px] font-bold text-[#1A1A2E] leading-relaxed">
            "{description}"
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 mx-6" />

        {/* Severity + Priority Row */}
        <div className="px-6 py-4 flex gap-6 mt-1">
          {/* Severity Gauge */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Severity</span>
              </div>
              <span className={`text-sm font-black tabular-nums text-[#1A1A2E]`}>{severity}/100</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className={`h-full rounded-full severity-bar-fill ${sevColors.bar}`}
                style={{ width: `${severity}%` }}
              />
            </div>
          </div>

          {/* Priority Badge */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Level</span>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-md border ${getPriorityBadge(priority)}`}>
              {priority}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mx-5" />

        {/* Recommended Gear */}
        <div className="px-6 py-4 pb-6 mt-1">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">Recommended Gear</span>
          </div>
          <div className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FEF3C7]">
            <p className="text-[11px] font-black text-[#92400E]">
              {getRecommendedGear(description)}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IntelBrief;
