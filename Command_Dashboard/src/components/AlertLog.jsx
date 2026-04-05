import React, { useRef, useEffect } from 'react';
import { Clock, Info, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

const AlertLog = ({ alerts }) => {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when a new alert is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [alerts]);

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          border: 'border-l-rose-500',
          text: 'text-rose-600',
          bg: 'bg-rose-50',
          icon: <XCircle className="w-4 h-4 text-rose-500" />
        };
      case 'WARNING':
        return {
          border: 'border-l-amber-500',
          text: 'text-amber-600',
          bg: 'bg-amber-50',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
        };
      case 'INFO':
      default:
        return {
          border: 'border-l-purple-500',
          text: 'text-purple-600',
          bg: 'bg-purple-50',
          icon: <Info className="w-4 h-4 text-purple-500" />
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Scrollable Alert List */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-4"
      >
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 gap-4 grayscale py-12">
            <div className="w-12 h-12 rounded-full border-2 border-rose-200 flex items-center justify-center animate-pulse">
               <div className="w-3 h-3 bg-rose-400 rounded-full" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#1A1A2E]">Scanning Buffer...</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <div 
                key={alert.id}
                className={`group relative flex flex-col gap-3 p-5 rounded-2xl border border-slate-100 border-l-4 bg-white hover:shadow-xl hover:shadow-purple-500/5 transition-all ${styles.border}`}
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2.5">
                    {styles.icon}
                    <span className={`text-[9px] font-black uppercase tracking-widest ${styles.text}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold tabular-nums tracking-tight uppercase">
                      {alert.timestamp}
                    </span>
                  </div>
                </div>

                <div className="text-[13px] font-black text-[#1A1A2E] tracking-tight leading-relaxed uppercase">
                  {alert.message}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] italic">
                    Src: {alert.source}
                  </div>
                </div>
                
                {/* Visual Glitch Detail */}
                <div className="absolute top-0 right-0 w-24 h-[1px] opacity-0 group-hover:opacity-40 transition-opacity bg-gradient-to-l from-transparent to-cyan-500" />
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      <div className="px-6 py-3.5 bg-white/60 border-t border-slate-100 flex justify-between">
        <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">
          TOTAL_DETECTED: {alerts.length}
        </span>
        <span className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest">
          STATUS_MONITORED
        </span>
      </div>
    </div>
  );
};

export default AlertLog;
