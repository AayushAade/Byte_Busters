import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SystemContext = createContext();

export const SystemProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [currentActiveDroneSource, setCurrentActiveDroneSource] = useState(localStorage.getItem('currentActiveDroneSource') || null);

  useEffect(() => {
    if (currentActiveDroneSource) {
      localStorage.setItem('currentActiveDroneSource', currentActiveDroneSource);
    }
  }, [currentActiveDroneSource]);

  const [radarNodes, setRadarNodes] = useState([]);
  const [mapState, setMapState] = useState({
    center: [18.5150, 73.8600],
    zoom: 12,
    markers: [
      { id: 'HUB_SWAR', pos: [18.5018, 73.8636], type: 'HUB', label: 'Swargate' },
      { id: 'HUB_SHIV', pos: [18.5314, 73.8446], type: 'HUB', label: 'Shivaji Nagar' },
      { id: 'HUB_HADA', pos: [18.5089, 73.9259], type: 'HUB', label: 'Hadapsar' },
      { id: 'HUB_KOTH', pos: [18.5074, 73.8077], type: 'HUB', label: 'Kothrud' }
    ],
    paths: []
  });
  const [alertLog, setAlertLog] = useState([]);
  const [fleetStatus, setFleetStatus] = useState([
    { id: 'ACTIVE', status: 'Active', count: 5, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { id: 'CHARGING', status: 'Charging', count: 4, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { id: 'STANDBY', status: 'Ready', count: 3, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
  ]);
  const [telemetry, setTelemetry] = useState({
    cpuLoad: 0,
    networkBandwidth: '0.00 Mbps',
    storageIOPS: '0.0 %',
    thermalState: 'AWAITING_LINK',
    encryption: 'LINKING...',
    speed: '0 kmph',
    alt: 200,
    battery: 64,
    eta: 'Standby',
    signal: 28
  });
  const [socket, setSocket] = useState(null);

  // ── NEW: SOS Emergency State (for auto-opening DeployModal) ──
  const [sosEmergency, setSosEmergency] = useState(null);

  // ── NEW: Global Active Mission State ──
  const [activeMission, setActiveMission] = useState(null);
  const [activeMissions, setActiveMissions] = useState([]);

  // ── NEW: Gemini Intelligence Brief State ──
  const [intelBrief, setIntelBrief] = useState(null);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true);
        setTelemetry(prev => ({ ...prev, thermalState: 'STABLE', encryption: 'AES-256 ACTIVE' }));
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        setVideoStream(null);
        setTelemetry(prev => ({ ...prev, thermalState: 'AWAITING_LINK', encryption: 'LINKING...' }));
      });

      socket.on('cctv_anomaly', (data) => {
        // High-Priority Alert Trigger from CCTV / SOS
        toast(`⚠️ Anomaly Logged: ${data.label || 'CCTV ALERT'}`, {
          icon: '👁️',
          style: { background: '#713f12', color: '#fff', border: '1px solid #eab308' }
        });

        setAlertLog(prev => [{
          id: `ALERT-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
          object: data.label || 'CCTV_ANOMALY',
          confidence: data.confidence || 0.92,
          type: 'CRITICAL',
          location: data.location || [18.4550, 73.8450],
          description: data.description || 'AI Intelligence stream pending...',
          requiresDeployment: true,
          status: 'PENDING_AUTHORITY'
        }, ...prev].slice(0, 50));
      });

      socket.on('vision_update', (data) => {
        if (data.image) {
          const formatted = data.image.startsWith('data:image') 
            ? data.image 
            : `data:image/jpeg;base64,${data.image}`;
          setVideoStream(formatted);
        }
        
        setTelemetry(prev => ({
          ...prev,
          cpuLoad: Math.floor(Math.random() * 5 + 82),
          networkBandwidth: `${(Math.random() * 2 + 12).toFixed(1)} Mbps`,
          storageIOPS: `${(Math.random() * 3 + 45).toFixed(1)} %`
        }));
      });

      // ── 1. The Pulse: UI Pulse Location ──
      socket.on('ui_pulse_location', (data) => {
        console.log('🔴 UI PULSE received:', data);
        
        toast.error(`🚨 SOS ALERT: ${data.type} Triggered`, {
          duration: 8000,
          style: { background: '#7f1d1d', color: '#fff', border: '1px solid #ef4444' }
        });

        const sosMarkerId = `SOS_${Date.now()}`;
        setMapState(prev => ({
          ...prev,
          markers: [
            ...prev.markers,
            {
              id: sosMarkerId,
              pos: [data.lat, data.lng],
              type: 'SOS_MARKER',
              label: `[SOS: ${data.type}]`
            }
          ]
        }));

        // Play alert sound
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const playBeep = (freq, startTime, duration) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = 'square';
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          playBeep(880, audioCtx.currentTime, 0.15);
          playBeep(880, audioCtx.currentTime + 0.2, 0.15);
          playBeep(1200, audioCtx.currentTime + 0.4, 0.3);
        } catch (e) { /* Audio not critical */ }

      });

      // ── 2. The Human-in-the-Loop: Trigger Deploy Prompt ──
      socket.on('trigger_deploy_prompt', (data) => {
        console.log('🚁 DEPLOY PROMPT received:', data);
        setSosEmergency({
          droneId: data.droneId,
          distance: data.distance,
          lat: data.lat,
          lng: data.lng,
          type: data.type,
          user: data.user,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false })
        });
      });

      // ── 4. The Intelligence Feed: Update Intel Brief ──
      socket.on('update_intel_brief', (data) => {
        console.log('🧠 INTEL BRIEF received:', data.report);
        
        toast.success(`🧠 Intel Brief: ${data.report.priority} Priority`, {
          duration: 6000,
          style: { background: '#0891b2', color: '#fff', border: '1px solid #164e63' }
        });

        setIntelBrief({
          severity: data.report.severity,
          priority: data.report.priority,
          description: data.report.description,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false })
        });
      });

      // ── 5. Real-Time Fleet Telemetry Sync ──
      socket.on('fleet_update', (data) => {
        setFleetStatus([
          { id: 'ACTIVE', status: 'Active', count: data.active, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
          { id: 'CHARGING', status: 'Charging', count: data.charging, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
          { id: 'STANDBY', status: 'Ready', count: data.ready, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
        ]);
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('cctv_anomaly');
        socket.off('vision_update');
        socket.off('ui_pulse_location');
        socket.off('trigger_deploy_prompt');
        socket.off('update_intel_brief');
        socket.off('fleet_update');
      };
    }
  }, [socket]);

  const deployDrone = (alertId, droneId = 'Alpha-1') => {
    const targetAlert = alertLog.find(a => a.id === alertId);

    // Update Alert Log Status
    setAlertLog(prev => prev.map(a => 
      a.id === alertId ? { ...a, status: 'EN_ROUTE', assignedUnit: droneId } : a
    ));

    // Update Map
    if (targetAlert) {
      setMapState(prev => ({
        ...prev,
        markers: prev.markers.map(m => 
          m.id === 'AERO_01' ? { ...m, pos: targetAlert.location, label: `[${droneId}: EN_ROUTE]` } : m
        ),
        paths: [[[18.4600, 73.8500], targetAlert.location]]
      }));
    }

    console.log(`🚀 DEPLOYED: Drone ${droneId} assigned to Case ${alertId}`);
  };

  // ── AUTO-CONNECT to socket relay on mount ──
  useEffect(() => {
    // DYNAMIC HOST: Laptop uses localhost/192.168.137.1, Phone uses 192.168.137.1
    const serverHost = window.location.hostname;
    const serverUrl = `http://${serverHost}:5001`;
    console.log('📡 Auto-connecting to socket relay:', serverUrl);
    const newSocket = io(serverUrl);
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const connectSystem = () => {
    if (!socket) {
      const serverHost = window.location.hostname;
      const serverUrl = `http://${serverHost}:5001`;
      setSocket(io(serverUrl));
    }
  };

  const disconnectSystem = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsConnected(false);
    setVideoStream(null);
    setAlertLog([]);
    setRadarNodes([]);
    setSosEmergency(null);
    setIntelBrief(null);
    setTelemetry({
      cpuLoad: 0,
      networkBandwidth: '0.00 Mbps',
      storageIOPS: '0.0 %',
      thermalState: 'AWAITING_LINK',
      encryption: 'LINKING...'
    });
  };

  // ── NEW: Global Tactical Hub Status (Linking, Online, Busy, Error) ──
  const [peerStatus, setPeerStatus] = useState('LINKING');
  const [uplinkStream, setUplinkStream] = useState(null);

  const value = {
    isConnected,
    videoStream,
    setVideoStream,
    currentActiveDroneSource,
    setCurrentActiveDroneSource,
    radarNodes,
    mapState,
    setMapState,
    alertLog,
    setAlertLog,
    fleetStatus,
    telemetry,
    setTelemetry,
    connectSystem,
    disconnectSystem,
    deployDrone,
    sosEmergency,
    setSosEmergency,
    intelBrief,
    setIntelBrief,
    activeMission,
    setActiveMission,
    activeMissions,
    setActiveMissions,
    uplinkStream,
    setUplinkStream,
    peerStatus,
    setPeerStatus
  };

  return (
    <SystemContext.Provider value={value}>
      {children}
    </SystemContext.Provider>
  );
};

// Satisfy Vite HMR Fast Refresh requirements
export const useSystemState = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystemState must be used within a SystemProvider');
  }
  return context;
};
