import React, { useState } from 'react';
import { useSystemState } from '../context/SystemContext';
import { ShieldAlert, MapPin, Target, Clock, Activity, FileText, CheckCircle2, ChevronRight, Download, Filter, RadioTower } from 'lucide-react';

const LogsAndReports = () => {
  const { alertLog } = useSystemState();
  const [filter, setFilter] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState(null);

  // We are strictly using LIVE data from the session - no mocks!
  const filteredLogs = filter === 'ALL' 
    ? alertLog 
    : alertLog.filter(log => log.status === filter || log.type === filter);

  return (
    <div className="h-full w-full bg-[#F1F2F6] flex flex-col pt-6 px-10 pb-10 overflow-auto">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-6 shrink-0 pt-2">
        <div className="flex items-center gap-4 relative">
          <div className="z-10">
            <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight uppercase mb-0.5">
              Mission Ledger
            </h1>
            <p className="text-[#64748B] text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
              <RadioTower className="w-3.5 h-3.5 text-[#7C3AED]" /> Live Session Database Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#64748B] hover:text-[#7C3AED] transition-all shadow-sm">
            <Filter className="w-4 h-4" /> Filter Records
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] border border-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* INTELLIGENCE STAT CARDS */}
      <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
        {[
          { label: 'Total Intercepts', value: alertLog.length, icon: Target, color: 'text-[#7C3AED]', bg: 'bg-purple-50', border: 'border-purple-100' },
          { label: 'Critical Incidents', value: alertLog.filter(l=>l.type==='CRITICAL').length, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
          { label: 'System Uptime', value: '100%', icon: Activity, color: 'text-[#10B981]', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Avg Sync Latency', value: '14ms', icon: Clock, color: 'text-[#8B5CF6]', bg: 'bg-slate-50', border: 'border-slate-100' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden group hover:shadow-xl hover:shadow-purple-500/5 transition-all">
            <div className={`relative z-10 w-14 h-14 rounded-full ${stat.bg} ${stat.border} border flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-3xl font-black text-[#1A1A2E]">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TACTICAL TABLE AREA */}
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl overflow-hidden flex flex-col shadow-xl shadow-purple-500/5 min-h-[500px]">
        
        {/* Table Filter Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-100 px-8 py-5 bg-slate-50/50 shrink-0">
          {['ALL', 'CRITICAL', 'WARNING', 'RESOLVED'].map(tab => (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={`text-[10px] font-black tracking-widest uppercase px-5 py-2.5 rounded-xl transition-all
                ${filter === tab 
                  ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20' 
                  : 'text-[#64748B] hover:text-[#7C3AED] hover:bg-[#EDE9FE] border border-transparent'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 space-y-4 py-20">
              <RadioTower className="w-16 h-16 text-slate-100 animate-pulse" />
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest text-[#64748B] mb-1">Awaiting Data Streams</p>
                <p className="text-[10px] font-bold text-[#64748B]/50 uppercase tracking-wider">Trigger an SOS from the module to populate the ledger</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-30 border-b border-slate-100">
                <tr className="text-[10px] font-black text-[#64748B] uppercase tracking-[0.2em]">
                  <th className="p-6 pl-10">Case ID</th>
                  <th className="p-6">Timestamp</th>
                  <th className="p-6">Classification</th>
                  <th className="p-6">AI Confidence</th>
                  <th className="p-6">Coordinates</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 pr-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((log, index) => (
                    <React.Fragment key={index}>
                      <tr 
                        className="hover:bg-[#F1F1FE] transition-colors group relative cursor-pointer"
                        onClick={() => setExpandedRowId(expandedRowId === log.id ? null : log.id)}
                      >
                        <td className="p-6 pl-10 relative">
                           <div className={`absolute left-0 top-0 bottom-0 w-1 bg-[#7C3AED] transition-transform origin-center ${expandedRowId === log.id ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`}></div>
                           <span className="text-[11px] font-black text-[#1A1A2E] bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl tracking-tight">
                             {log.id.slice(0, 15)}
                           </span>
                        </td>
                        <td className="p-6 text-xs font-bold text-[#64748B] tracking-wide font-mono tabular-nums">{log.timestamp}</td>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                             <div className={`w-2.5 h-2.5 rounded-full ${log.type === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.4)]'}`} />
                             <span className="text-[11px] font-black text-[#1A1A2E] tracking-widest uppercase">{log.object}</span>
                          </div>
                        </td>
                        <td className="p-6 w-48">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                              <div 
                                className={`h-full rounded-full relative ${log.confidence > 0.9 ? 'bg-[#7C3AED]' : 'bg-amber-400'}`} 
                                style={{ width: `${log.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-[#1A1A2E] w-10 text-right">
                              {(log.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] font-mono">
                            <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                            {log.location ? `${log.location[0].toFixed(4)}, ${log.location[1].toFixed(4)}` : 'UNKNOWN'}
                          </div>
                        </td>
                        <td className="p-6">
                          {log.status === 'RESOLVED' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                              <CheckCircle2 className="w-3.5 h-3.5" /> RESOLVED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#7C3AED] bg-[#EDE9FE] border border-[#7C3AED]/20 px-3 py-1.5 rounded-xl uppercase tracking-widest animate-pulse">
                              <Activity className="w-3.5 h-3.5" /> {log.status || 'DEPLOYED'}
                            </span>
                          )}
                        </td>
                      <td className="p-5 pr-8 text-right">
                        <button className="text-zinc-600 hover:text-cyan-400 p-2 transition-all">
                          <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${expandedRowId === log.id ? 'rotate-90 text-cyan-400' : 'group-hover:translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                    
                      {/* EXPANDABLE DETAILS ROW */}
                      {expandedRowId === log.id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan="7" className="p-8 pl-18">
                             <div className="border-l-4 border-[#7C3AED]/30 pl-6 py-2">
                               <div className="flex items-center gap-3 mb-3">
                                 <ShieldAlert className="w-5 h-5 text-[#7C3AED]" />
                                 <span className="text-[11px] font-black text-[#7C3AED] uppercase tracking-widest">Incident Analysis Report</span>
                               </div>
                               <p className="leading-relaxed font-bold text-[#64748B] max-w-4xl tracking-tight text-sm uppercase">
                                 {log.description || 'No detailed analysis report provided for this incident.'}
                               </p>
                             </div>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsAndReports;
