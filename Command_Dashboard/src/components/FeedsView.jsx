import React, { useState } from 'react';
import { 
  LayoutGrid, List, Maximize2, ExternalLink, Copy, 
  Activity, Battery, Shield, Radio, ChevronDown 
} from 'lucide-react';
import { useSystemState } from '../context/SystemContext';
import YoloScanner from './YoloScanner';

const FeedsView = () => {
  const { setCurrentActiveDroneSource } = useSystemState();
  const [viewMode, setViewMode] = useState('grid');
  const [activeDroneId, setActiveDroneId] = useState('Responder 1');
  const [fullscreenDrone, setFullscreenDrone] = useState(null);

  // Drone fleet data
  const drones = [
    { id: 'Responder 1', battery: '84%', alt: '198ft', status: 'LIVE', type: 'SWAT Lemur' },
    { id: 'SWAT Lemur 2', battery: '92%', alt: '210ft', status: 'LIVE', type: 'Patrol' },
    { id: 'SWAT Lemur 3', battery: '45%', alt: '150ft', status: 'LIVE', type: 'SWAT Lemur' },
    { id: 'Responder 2', battery: '12%', alt: '0ft', status: 'DOCK', type: 'Responder' },
    { id: 'SWAT Lemur 2B', battery: '76%', alt: '300ft', status: 'LIVE', type: 'SWAT Lemur' },
    { id: 'Patrol Lemur 3', battery: '88%', alt: '180ft', status: 'LIVE', type: 'Patrol' },
    { id: 'SWAT Lemur 3C', battery: '100%', alt: '0ft', status: 'STANDBY', type: 'SWAT Lemur' },
    { id: 'Responder 3', battery: '62%', alt: '410ft', status: 'LIVE', type: 'Responder' },
    { id: 'Patrol Lemur 1', battery: '95%', alt: '205ft', status: 'LIVE', type: 'Patrol' },
  ];

  const handleFocus = (drone) => {
    setFullscreenDrone(drone);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F1F2F6] text-[#1A1A2E] font-sans overflow-hidden">
      
      <main className="flex-1 overflow-auto p-8 custom-scrollbar">
        {/* LIST CONTAINER FIX: w-full max-w-5xl mx-auto flex flex-col gap-3 */}
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "w-full max-w-5xl mx-auto flex flex-col gap-3"}>
          {drones.map((drone, index) => (
            <div 
              key={drone.id} 
              onMouseEnter={() => setActiveDroneId(drone.id)} 
              className={`group relative rounded-2xl overflow-hidden border bg-white transition-all duration-300 ${viewMode === 'grid' ? 'aspect-video' : 'p-5 flex items-center w-full'} ${activeDroneId === drone.id ? 'border-[#7C3AED]/50 shadow-2xl shadow-purple-500/10 scale-[1.02] z-10' : 'border-slate-100'}`}
            >
              
              {/* === GRID VIEW UI === */}
              {viewMode === 'grid' ? (
                <>
                  <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-2">
                       <Radio className="w-8 h-8 text-[#7C3AED] opacity-20 animate-pulse" />
                      <span className="text-slate-300 font-black tracking-[0.4em] text-xl uppercase italic">Standing By</span>
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 z-10 p-5 flex flex-col justify-between pointer-events-none">
                    <div className="flex justify-between items-start pointer-events-none">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${drone.status === 'LIVE' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-300'}`} />
                        <span className="text-[12px] font-black text-[#1A1A2E] uppercase tracking-wider">{drone.id}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        <button className="p-2 bg-white/90 backdrop-blur-md rounded-xl border border-slate-100 hover:bg-[#EDE9FE] text-[#7C3AED] shadow-lg"><Copy size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleFocus(drone); }} className="p-2 bg-[#7C3AED] rounded-xl text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-all"><Maximize2 size={14}/></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pointer-events-none">
                      <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                        <span className="flex items-center gap-1.5"><Battery size={14} className="text-[#10B981]" /> {drone.battery}</span>
                        <span className="flex items-center gap-1.5"><Activity size={14} className="text-[#7C3AED]" /> {drone.alt}</span>
                      </div>
                      <div className="text-[9px] font-black text-slate-300 uppercase italic tracking-[0.2em]">{drone.type}</div>
                    </div>
                  </div>
                </>
              ) : (

              /* === LIST VIEW UI === */
                <>
                  {/* COLUMN 1: ID */}
                  <div className="flex-1 flex items-center gap-4 relative z-10">
                    <div className={`w-2.5 h-2.5 rounded-full ${drone.status === 'LIVE' ? 'bg-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.4)] animate-pulse' : 'bg-slate-200'}`} />
                    <span className="text-sm font-black text-[#1A1A2E] uppercase tracking-wider">{drone.id}</span>
                  </div>
                  
                  {/* COLUMN 2: Telemetry */}
                  <div className="flex-1 flex justify-center gap-10 text-[11px] font-black uppercase tracking-widest text-[#64748B] relative z-10">
                    <span className="flex items-center gap-2 w-24"><Battery size={16} className={drone.status === 'DOCK' ? 'text-rose-500' : 'text-[#10B981]'} /> {drone.battery}</span>
                    <span className="flex items-center gap-2 w-24"><Activity size={16} className="text-[#7C3AED]" /> {drone.alt}</span>
                  </div>
 
                  {/* COLUMN 3: Actions */}
                  <div className="flex-1 flex justify-end items-center gap-6 relative z-10">
                    <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-[0.2em] hidden sm:block">{drone.type}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleFocus(drone); }} className="px-6 py-2.5 bg-[#7C3AED] text-white rounded-xl shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all flex items-center gap-2 text-[11px] font-black uppercase tracking-widest"><Maximize2 size={14}/> Full Feed</button>
                  </div>
                </>
              )}

              {/* SHARED SCANLINE EFFECT - More subtle for light theme */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)]" />
            </div>
          ))}
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272A; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* FULLSCREEN INVESTIGATION MODAL */}
      {fullscreenDrone && (
        <div className="absolute inset-0 z-[100] bg-[#F1F2F6] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.4)]" />
              <span className="text-[#1A1A2E] font-black tracking-widest uppercase text-sm">
                {fullscreenDrone.id} - ACTIVE INVESTIGATION
              </span>
            </div>
            <button 
              onClick={() => setFullscreenDrone(null)} 
              className="px-6 py-2 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white rounded-xl text-[11px] font-black tracking-widest uppercase transition-all shadow-sm"
            >
              Close Feed
            </button>
          </header>
          <div className="flex-1 relative bg-black">
            {/* Load YOLO Scanner with the selected drone's footage */}
            <YoloScanner 
              videoSrc={fullscreenDrone.id === 'Responder 1' 
                ? "/video/cctv/14737129_3840_2160_50fps.mp4" 
                : `/video/${fullscreenDrone.id.replace(/\s+/g, '_').toLowerCase()}.mp4`
              } 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedsView;