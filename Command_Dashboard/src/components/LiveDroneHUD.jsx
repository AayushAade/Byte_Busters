import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { useMap } from 'react-leaflet';
import CommandMap from './CommandMap';
import {
  Video, Grid, Crosshair, Users, Layers, MoreHorizontal,
  ChevronDown, Phone, Shield, Radio, Signal, Battery,
  Navigation, Plus, ChevronLeft, Mic, Target, Maximize,
  Settings, Minus, Map as MapIcon, Camera, Disc, Thermometer,
  Wind, Cloud
} from 'lucide-react';
import { useSystemState } from '../context/SystemContext';

// 1. MiniMap Controls Component
const MiniMapControls = ({ toggleExpand, isExpanded }) => {
  const map = useMap();

  return (
    <>
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000] pointer-events-auto">
        <MapControlButton
          icon={Target}
          onClick={() => map.setView([18.5204, 73.8567], 15)}
          tooltip="Locate Asset"
        />
        <div className="flex flex-col bg-black/60 rounded-lg border border-white/10 overflow-hidden">
          <MapControlButton
            icon={Plus}
            onClick={() => map.zoomIn()}
            tooltip="Zoom In"
          />
          <div className="h-px bg-white/10 mx-1" />
          <MapControlButton
            icon={Minus}
            onClick={() => map.zoomOut()}
            tooltip="Zoom Out"
          />
        </div>
        <MapControlButton
          icon={Navigation}
          tooltip="Center Map"
        />
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        <MapControlButton
          icon={Maximize}
          active={isExpanded}
          onClick={toggleExpand}
          tooltip={isExpanded ? "Minimize" : "Full View"}
        />
      </div>

      <div className="absolute top-4 right-4 z-[1000] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
        <MapControlButton icon={Settings} />
      </div>

      {/* Location Pill logic moved inside for proper positioning over map */}
      <div className="absolute top-4 right-12 z-[1000] bg-white/90 backdrop-blur border border-slate-200 rounded-xl px-4 py-2.5 flex gap-3 items-center shadow-xl pointer-events-none">
        <div className="w-8 h-8 bg-[#EDE9FE] border border-[#7C3AED]/20 rounded-full flex items-center justify-center">
          <Navigation className="w-4 h-4 text-[#7C3AED]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-black text-[#1A1A2E] leading-none mb-0.5">Pune, MH</span>
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider uppercase">Sector 7 Command</span>
        </div>
      </div>
    </>
  );
};

// UI Components
const SidebarIconButton = ({ icon: Icon, active = false, size = 20, onClick }) => (
  <div
    onClick={onClick}
    className={`p-2.5 rounded-lg cursor-pointer transition-all border ${active ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-transparent text-zinc-500 hover:text-white'}`}
  >
    <Icon size={size} />
  </div>
);

const MapControlButton = ({ icon: Icon, active, onClick, tooltip }) => (
  <button
    title={tooltip}
    onClick={onClick}
    className={`w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl transition-all shadow-lg
      ${active ? 'bg-[#7C3AED] text-white' : 'bg-white/80 border border-slate-100 text-[#64748B] hover:bg-[#EDE9FE]'}`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-[#64748B]'}`} />
  </button>
);

const ActionButton = ({ icon: Icon, hint, color, onClick }) => (
  <div className="flex items-center gap-4 group pointer-events-auto">
    <div
      onClick={onClick}
      className="w-12 h-12 bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-[#EDE9FE] cursor-pointer transition-all shadow-xl shadow-purple-500/5 relative"
    >
      <Icon className={`w-6 h-6 ${color || 'text-[#7C3AED]'}`} />
      {hint && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#7C3AED] rounded-lg border border-white flex items-center justify-center text-[9px] font-black text-white leading-none shadow-md">{hint}</span>}
    </div>
  </div>
);

const PayloadButton = ({ hint, active, onClick, title }) => (
  <div
    onClick={onClick}
    title={title}
    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black transition-all cursor-pointer border
      ${active ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-purple-500/30' : 'bg-slate-50 border-slate-100 text-[#64748B] hover:bg-[#EDE9FE]'}`}>
    {hint}
  </div>
);

const CameraSwitcherButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 text-[11px] font-black rounded-xl transition-all uppercase tracking-tight
      ${active ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20' : 'text-[#64748B] hover:bg-[#EDE9FE] hover:text-[#7C3AED]'}`}>
    {label}
  </button>
);

const LiveDroneHUD = ({ onBack, caseId }) => {
  const { mapState, alertLog, telemetry, uplinkStream, peerStatus } = useSystemState();

  const isDirectObject = typeof caseId === 'object' && caseId !== null;

  let targetLat = 18.5204;
  let targetLng = 73.8567;
  let assignedUnit = 'Swargate Drone';

  if (isDirectObject) {
    targetLat = caseId.lat;
    targetLng = caseId.lng;
    assignedUnit = caseId.droneId || 'Swargate Drone';
  } else {
    const alert = alertLog.find(a => a.id === caseId) || alertLog[0];
    if (alert) {
      targetLat = alert.location ? alert.location[0] : 18.5204;
      targetLng = alert.location ? alert.location[1] : 73.8567;
      assignedUnit = alert.assignedUnit || 'Swargate Drone';
    }
  }

  let tempStartPos = [18.5018, 73.8636];
  if (assignedUnit.includes('Shivaji')) tempStartPos = [18.5314, 73.8446];
  else if (assignedUnit.includes('Hadapsar')) tempStartPos = [18.5089, 73.9259];
  else if (assignedUnit.includes('Kothrud')) tempStartPos = [18.5074, 73.8077];

  const [isAutopilot, setIsAutopilot] = useState(true);
  const [activeCamera, setActiveCamera] = useState('gimbal');
  const [activePayload, setActivePayload] = useState('L');
  const [isMicLive, setIsMicLive] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const videoRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (uplinkStream && videoRef.current) {
      videoRef.current.srcObject = uplinkStream;
      videoRef.current.play().catch(console.warn);
    }
  }, [uplinkStream]);

  const forceSyncStream = () => {
    if (uplinkStream && videoRef.current) {
        videoRef.current.srcObject = uplinkStream;
        videoRef.current.play().catch(console.error);
    }
  };

  const toggleRecording = () => setIsRecording(!isRecording);
  const takeScreenshot = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'r') toggleRecording();
      else if (e.key.toLowerCase() === 'p') takeScreenshot();
      else if (e.key.toLowerCase() === 'k') setIsMicLive(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none z-0">
      <video
        ref={videoRef}
        autoPlay playsInline muted
        className="absolute inset-0 w-full h-full object-cover z-0 bg-slate-900"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none z-[1]" />
      <div className="absolute inset-0 pointer-events-none opacity-5 tactical-grid z-[1]" />
      {flash && <div className="absolute inset-0 bg-white z-[100] opacity-80" />}

      <div className="w-full h-full relative z-10">
        
        <div className="absolute top-8 left-10 flex flex-col z-40">
          <span className="text-3xl font-black tracking-tighter text-white uppercase drop-shadow-lg">SKYNETRA</span>
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] -mt-1">Active Mission Feed</span>
        </div>

        <div className="absolute top-20 left-10 z-50 flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 backdrop-blur-md transition-all duration-500 ${peerStatus === 'ONLINE' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${peerStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] drop-shadow-md">
              HUB: {peerStatus} {uplinkStream && ' | UPLINK: LIVE'}
            </span>
          </div>
          {uplinkStream && (
            <button onClick={forceSyncStream} className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white/50 hover:text-white transition-all shadow-lg">
              <Radio size={14} />
            </button>
          )}
        </div>

        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
          <div className="flex items-center gap-6 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 px-8 py-4 text-[12px] font-black text-white tabular-nums shadow-2xl">
            <div className="flex items-center gap-2"><Navigation size={18} className="text-slate-400" /> <span className="text-purple-400">{telemetry?.speed || '0 KMPH'}</span></div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2"><Target size={18} className="text-slate-400" /> <span className="text-purple-400">{telemetry?.alt || 200} FT</span></div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2 tabular-nums uppercase tracking-widest text-[10px] text-slate-400">{currentTime}</div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2"><Battery size={18} className={telemetry?.battery < 20 ? 'text-red-500 animate-pulse' : 'text-emerald-500'} /> <span>{telemetry?.battery || 64}%</span></div>
          </div>
        </div>

        <div className={`absolute top-24 right-8 z-40 bg-black/60 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 shadow-2xl ${isMapExpanded ? 'w-[640px] h-[440px]' : 'w-84 h-64'}`}>
          <CommandMap mapState={{ ...mapState, zoom: 12, center: tempStartPos }} isTactical={true}>
            <MiniMapControls isExpanded={isMapExpanded} toggleExpand={() => setIsMapExpanded(!isMapExpanded)} />
          </CommandMap>
        </div>

        {!uplinkStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-[2]">
            <div className="flex flex-col items-center gap-8 text-center">
              <div className="relative">
                <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                   {peerStatus === 'BUSY' ? <Shield size={40} className="text-red-500 scale-110" /> : <Target size={40} className="text-white/40 animate-pulse" />}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white text-xl font-black tracking-widest uppercase">{peerStatus === 'BUSY' ? 'HUB ID CONFLICT' : 'AWAITING TACTICAL LINK'}</h3>
                <p className="text-slate-400 text-[11px] max-w-[280px] leading-relaxed uppercase tracking-widest font-bold">
                   {peerStatus === 'BUSY' ? 'Another dashboard tab is open. Please close all other SkyNetra tabs.' : 'Mediating downlink from mobile node skynetra-01...'}
                </p>
              </div>
              <button 
                onClick={() => window.reconnectHub && window.reconnectHub()}
                className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-purple-900/50 active:scale-95 border border-purple-500/50"
              >
                Force Hub Reconnect
              </button>
            </div>
          </div>
        )}

        <div className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-8 z-40">
           <div className="flex flex-col gap-4">
              <ActionButton hint="R" icon={Disc} onClick={toggleRecording} color={isRecording ? 'text-red-500 animate-pulse' : 'text-purple-400'} />
              <ActionButton hint="P" icon={Camera} onClick={takeScreenshot} />
              <ActionButton hint="B" icon={ChevronLeft} onClick={onBack} />
           </div>
           
           <div className="flex items-center gap-4">
              <div onClick={() => setIsMicLive(!isMicLive)} className={`w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-2xl border border-white/10 ${isMicLive ? 'bg-red-500 animate-pulse' : 'bg-purple-600'}`}>
                <Mic size={24} className="text-white" />
              </div>
              <div className="bg-black/60 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shadow-2xl">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{isMicLive ? 'MIC ACTIVE' : 'PRESS K TO BROADCAST'}</span>
              </div>
           </div>
        </div>

        <div className="absolute bottom-10 left-10 flex gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-3 z-40 shadow-2xl">
            {['L','F','E','N','T','Y','J'].map(t => (
              <PayloadButton key={t} hint={t} active={activePayload === t} onClick={() => setActivePayload(t)} />
            ))}
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
            <button onClick={() => setIsAutopilot(!isAutopilot)} className={`px-10 py-4 rounded-full flex items-center gap-5 transition-all shadow-2xl border border-white/10 ${isAutopilot ? 'bg-purple-600 text-white shadow-purple-900/50' : 'bg-black/60 text-slate-500'}`}>
               <div className={`w-3 h-3 rounded-full ${isAutopilot ? 'bg-white animate-pulse' : 'bg-slate-700'}`} />
               <span className="text-[12px] font-black tracking-[0.25em] uppercase">Status: {isAutopilot ? 'Autopilot' : 'Manual View'}</span>
            </button>
        </div>

        <div className="absolute bottom-10 right-10 flex items-center gap-5 z-40">
            <div className="flex bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-3 gap-3 shadow-2xl">
              {['Gimbal', 'Forward', 'Thermal'].map(l => (
                <CameraSwitcherButton key={l} label={l} active={activeCamera === l.toLowerCase()} onClick={() => setActiveCamera(l.toLowerCase())} />
              ))}
            </div>
            <button className="bg-purple-600 border border-purple-500 text-white p-4 rounded-2xl shadow-xl shadow-purple-900/50"><Maximize size={22} /></button>
        </div>
      </div>
    </div>
  );
};

export default LiveDroneHUD;
