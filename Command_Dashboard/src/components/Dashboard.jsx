import React from 'react';
import { toast } from 'react-hot-toast';
import {
  Video, Grid, Crosshair, Users, Layers, MoreHorizontal,
  ChevronDown, Phone, Shield, Radio, Signal, Battery, Navigation, Plus, Camera, FileText
} from 'lucide-react';
import { useSystemState } from '../context/SystemContext';
import CommandMap from './CommandMap';
import LiveDroneHUD from './LiveDroneHUD';
import LiveDroneFeed from './LiveDroneFeed';
import MissionHUD from './MissionHUD';
import DeployModal from './DeployModal';
import FeedsView from './FeedsView';
import IntelBrief from './IntelBrief';
import LogsAndReports from './LogsAndReports';
import { Peer } from 'peerjs';

const Dashboard = () => {
  const {
    mapState, fleetStatus, telemetry, alertLog, deployDrone,
    setCurrentActiveDroneSource,
    sosEmergency, setSosEmergency,
    intelBrief, setIntelBrief,
    activeMission, setActiveMission,
    activeMissions, setActiveMissions,
    peerStatus, setPeerStatus,
    setUplinkStream
  } = useSystemState();

  const [activeView, setActiveView] = React.useState('dashboard');
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const [pendingAlertId, setPendingAlertId] = React.useState(null);

  // VIDEO UPLOAD STATE
  const [isVideoUploadModalOpen, setIsVideoUploadModalOpen] = React.useState(false);
  const [uploadVideoFile, setUploadVideoFile] = React.useState(null);
  const [uploadCameraId, setUploadCameraId] = React.useState('');

  const PUNE_CAMERAS = [
    { id: 'CAM_PUN_01', name: 'Katraj Junction' },
    { id: 'CAM_PUN_02', name: 'Swargate Square' },
    { id: 'CAM_PUN_03', name: 'Shivajinagar Station' },
    { id: 'CAM_PUN_04', name: 'Kothrud Stand' },
    { id: 'CAM_PUN_05', name: 'Deccan Gymkhana' },
    { id: 'CAM_PUN_06', name: 'Hinjewadi Phase 1' },
    { id: 'CAM_PUN_07', name: 'Baner Road' },
    { id: 'CAM_PUN_08', name: 'Kharadi Bypass' },
    { id: 'CAM_PUN_09', name: 'Viman Nagar' },
    { id: 'CAM_PUN_10', name: 'Wakad Bridge' }
  ];

  // Function to handle global redirects from any component
  const handleDroneRedirect = (source) => {
    setCurrentActiveDroneSource(source);
    setActiveView('drone');
    setActiveMission('MANUAL_FEED');
  };

  // Removed redundant pending alert filter logic

  // ── AUTO-DEPLOY ON SOS ──
  React.useEffect(() => {
    if (sosEmergency) {
      if (sosEmergency.droneId === "NO DRONES AVAILABLE") {
        toast.error(`CRITICAL: No drones available! All units are depleted or engaged. Manual intervention required.`, {
          duration: 6000,
          style: { background: '#7f1d1d', color: '#fff', border: '1px solid #ef4444', minWidth: '400px' }
        });
      } else {
        toast.success(`AUTO-DEPLOYING ${sosEmergency.droneId} to incident...`, { duration: 4000 });

        // Auto Deploy instantly without relying on stale alertLog state!
        const newM = {
          id: `SOS_TRIGGERED_${Date.now()}`,
          lat: sosEmergency.lat,
          lng: sosEmergency.lng,
          droneId: sosEmergency.droneId,
          startTime: Date.now()
        };
        setActiveMission(newM.id);
        setActiveMissions(prev => [...prev, newM]);
      }

      setSosEmergency(null);
      setIsDeployModalOpen(false);
    }
  }, [sosEmergency]);

  const peerInstance = React.useRef(null);

  const initPeer = () => {
    // 1. Cleanup existing instance if any
    if (peerInstance.current) {
      peerInstance.current.destroy();
      peerInstance.current = null;
    }

    setPeerStatus('LINKING');
    console.log(`📡 Initializing Tactical Hub on ${window.location.hostname}...`);

    // DYNAMIC HOST: Laptop uses localhost/192.168.137.1, Phone uses 192.168.137.1
    const serverHost = window.location.hostname;
    
    // Assign global reconnect for HUD button
    window.reconnectHub = initPeer;

    const peerOptions = {
      host: serverHost,
      port: 9000,
      path: '/peerjs',
      secure: false,
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    };

    try {
      const peer = new Peer('skynetra-hub-01', peerOptions);
      peerInstance.current = peer;

      peer.on('open', () => {
        console.log('✅ Tactical Hub is ONLINE');
        setPeerStatus('ONLINE');
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
           console.error('❌ Hub ID skynetra-hub-01 is BUSY (another tab is likely open).');
           setPeerStatus('BUSY');
        } else {
           console.error('❌ Hub PeerJS Error:', err.type, err);
           setPeerStatus('ERROR');
        }
      });

      peer.on('call', (call) => {
        console.log('⚠️ Incoming Tactical Feed Detected...');
        setActiveView('drone');
        setActiveMission('MOBILE_FEED');
        
        call.answer();
        
        call.on('stream', (remoteStream) => {
          console.log('✅ Tactical stream attached!');
          setUplinkStream(remoteStream);
        });

        call.on('close', () => {
          console.log('Transmission closed by peer.');
          setUplinkStream(null);
        });
      });
    } catch (e) {
      console.error('Initial Peer creation failed:', e);
      setPeerStatus('ERROR');
    }
  };

  React.useEffect(() => {
    initPeer();
    return () => {
      if (peerInstance.current) peerInstance.current.destroy();
    };
  }, []);

  const handleDeploy = (caseId, droneId = 'SN_DRONE01') => {
    // Update drone target in system context if needed
    deployDrone(caseId, droneId);

    // Convert string generic caseId into robust Object fallback if missing
    setActiveMission(caseId);
    setActiveMissions(prev => [...prev, {
      id: caseId,
      droneId: droneId,
      startTime: Date.now()
    }]);
    // Don't auto-jump! Watch it on dashboard map
  };

  const handleEndMission = () => {
    setActiveMission(null);
    setActiveView('dashboard');
  };

  // Handle SOS deploy confirmation
  const handleSOSDeploy = (droneId) => {
    setIsDeployModalOpen(false);
    if (sosEmergency) {
      // Deploy the first pending alert
      const firstPending = alertLog.find(a => a.status === 'PENDING_AUTHORITY');
      if (firstPending) {
        handleDeploy(firstPending.id, droneId);
      } else {
        handleDeploy('SOS_MISSION', droneId);
      }
    } else if (pendingAlertId) {
      handleDeploy(pendingAlertId, droneId);
      setPendingAlertId(null);
    } else {
      handleDeploy('MANUAL_MISSION', droneId);
    }
    setSosEmergency(null);
  };

  // Handle SOS standby (dismiss without deploying)
  const handleSOSStandby = () => {
    setSosEmergency(null);
    setPendingAlertId(null);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsDeployModalOpen(false);
    setSosEmergency(null);
    setPendingAlertId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-[#F1F2F6] text-[#1A1A2E] font-sans overflow-hidden select-none">

      {/* 4. THE LEFT SIDEBAR (Global App Shell) */}
      <aside className="fixed left-0 top-0 h-screen w-20 bg-[#F1F1FE] border-r border-slate-200 flex flex-col items-center py-6 z-50">
        <div className="mb-10">
          <div className="w-11 h-11 bg-[#7C3AED] rounded-xl flex items-center justify-center cursor-pointer hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>

        <nav className="flex flex-col gap-4 items-center">
          <SidebarIcon
            icon={Grid}
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
          />
          <SidebarIcon
            icon={Crosshair}
            active={activeView === 'drone'}
            onClick={() => setActiveView('drone')}
          />
          <SidebarIcon
            icon={Video}
            active={activeView === 'feeds'}
            onClick={() => { setActiveView('feeds'); setActiveMission('MANUAL_FEED'); }}
          />

          {/* New Video Upload Button */}
          <div
            onClick={() => setIsVideoUploadModalOpen(true)}
            className="p-3 transition-all cursor-pointer group flex items-center justify-center rounded-2xl hover:bg-[#EDE9FE] text-[#64748B]"
            title="Upload Video Feed"
          >
            <Camera className="w-6 h-6 transition-colors group-hover:text-[#7C3AED]" />
          </div>

          <SidebarIcon icon={Users} active={activeView === 'team'} onClick={() => setActiveView('team')} />
          <SidebarIcon icon={Layers} active={activeView === 'layers'} onClick={() => setActiveView('layers')} />
          <SidebarIcon icon={FileText} active={activeView === 'logs'} onClick={() => setActiveView('logs')} />
        </nav>

      </aside>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 ml-20 relative overflow-hidden flex flex-col pt-4">

        <div className="flex-1 relative">

          {/* Dynamic Content Rendering based on activeView */}
          {activeView === 'feeds' && (
            <div className="absolute inset-0 z-10 transition-all duration-500 animate-in fade-in">
              <FeedsView onGoToLive={handleDroneRedirect} />
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="absolute inset-0 z-0 bg-black">
              <CommandMap
                mapState={mapState}
                onDeployClick={() => setIsDeployModalOpen(true)}
              />

              {/* OVERVIEW MODE OVERLAYS (City View) */}
              <div className="absolute top-4 right-4 z-50 flex justify-end pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-4 py-2 flex items-center gap-3 cursor-default shadow-lg">
                  <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center border border-[#7C3AED]/20">
                    <Users className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <span className="text-xs font-bold text-[#1A1A2E]">Aayush Aade</span>
                  <ChevronDown className="w-4 h-4 text-[#64748B]" />
                </div>
              </div>

              {/* FLOATING RIGHT WIDGETS */}
              <div className="absolute top-20 right-4 w-[340px] z-10 flex flex-col gap-4 pointer-events-auto">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-400 rounded-2xl p-5 shadow-xl shadow-slate-200/50 transition-all hover:bg-white/90">
                  <h3 className="text-m font-black tracking-widest mb-4 text-[#7C3AED] uppercase">SkyNetra Fleet</h3>
                  <div className="flex gap-2">
                    {fleetStatus.map(f => (
                      <FleetPill key={f.id} label={f.status} count={f.count} color={f.color} />
                    ))}
                  </div>
                </div>

              </div>

              {/* New Deployment Button Removed Per User Request */}
            </div>
          )}

          {activeView === 'drone' && (
            <div className="absolute inset-0 z-30 transition-all duration-500 animate-in fade-in">
              <LiveDroneHUD
                onBack={() => setActiveView('dashboard')}
                caseId={activeMission || 'Manual Feed'}
              />
            </div>
          )}

          {activeView === 'logs' && (
            <div className="absolute inset-0 z-20 animate-in fade-in">
              <LogsAndReports />
            </div>
          )}

          {/* Placeholder for other views */}
          {(activeView === 'team' || activeView === 'layers') && (
            <div className="flex items-center justify-center h-full bg-zinc-900/50">
              <h1 className="text-zinc-500 font-black text-4xl uppercase tracking-widest">{activeView} View</h1>
            </div>
          )}

          {/* Deploy Modal — handles both manual and SOS-triggered deployments */}
          <DeployModal
            isOpen={isDeployModalOpen}
            onClose={handleModalClose}
            emergencyData={sosEmergency}
            onStandby={handleSOSStandby}
            onDeploy={handleSOSDeploy}
          />

          {/* Mission Intelligence Brief — visible in ALL views */}
          <IntelBrief
            intelBrief={intelBrief}
            onDismiss={() => setIntelBrief(null)}
          />

          {/* Video Upload Selection Modal */}
          {isVideoUploadModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Upload Camera Feed</h2>
                <p className="text-zinc-400 text-sm mb-6">Select a regional camera ID and upload the video source to initiate pipeline analysis.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Camera Location</label>
                    <select
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      value={uploadCameraId}
                      onChange={(e) => setUploadCameraId(e.target.value)}
                    >
                      <option value="" disabled>Select a location...</option>
                      {PUNE_CAMERAS.map(cam => (
                        <option key={cam.id} value={cam.id}>
                          {cam.id} - {cam.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Video Source</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="video/*"
                        id="video-upload-input"
                        className="hidden"
                        onChange={(e) => setUploadVideoFile(e.target.files[0])}
                      />
                      <label
                        htmlFor="video-upload-input"
                        className="w-full flex items-center justify-between bg-[#0a0a0a] border border-dashed border-white/20 hover:border-cyan-500/50 rounded-lg p-3 cursor-pointer transition-colors"
                      >
                        <span className={`text-sm ${uploadVideoFile ? 'text-cyan-400 font-medium' : 'text-zinc-500'}`}>
                          {uploadVideoFile ? uploadVideoFile.name : 'Choose video file...'}
                        </span>
                        <Video className="w-4 h-4 text-zinc-400" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => {
                      setIsVideoUploadModalOpen(false);
                      setUploadVideoFile(null);
                      setUploadCameraId('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!uploadVideoFile || !uploadCameraId}
                    className="px-6 py-2 rounded-lg text-sm font-bold bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                    onClick={async () => {
                      const formData = new FormData();
                      formData.append('video', uploadVideoFile);
                      formData.append('camera_id', uploadCameraId);

                      try {
                        const res = await fetch(`http://${window.location.hostname}:5002/upload_video`, {
                          method: 'POST',
                          body: formData
                        });

                        const data = await res.json();
                        if (data.status === 'SUCCESS') {
                          toast.success(`Video uploaded successfully to ${uploadCameraId}`);
                          console.log('Server response:', data);
                        } else {
                          toast.error(`Upload failed: ${data.message}`);
                        }
                      } catch (err) {
                        console.error('Upload connection error:', err);
                        // Show the actual error message in the toast to understand what failed
                        toast.error(`Connection failed: ${err.message || 'Server completely unreachable'}`);
                      }

                      setIsVideoUploadModalOpen(false);
                      setUploadVideoFile(null);
                      setUploadCameraId('');
                    }}
                  >
                    Confirm Upload
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

const SidebarIcon = ({ icon: Icon, active = false, onClick }) => (
  <div
    onClick={onClick}
    className={`p-3.5 transition-all cursor-pointer group flex items-center justify-center rounded-2xl
      ${active
        ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/30'
        : 'hover:bg-[#EDE9FE] text-[#64748B]'}`}
  >
    <Icon className={`w-6 h-6 transition-colors ${active ? 'text-white' : 'group-hover:text-[#7C3AED]'}`} />
  </div>
);

const FleetPill = ({ label, count, color }) => (
  <div className={`flex-1 flex flex-col items-center py-2 rounded-xl border border-slate-100 bg-[#F8FAFC]`}>
    <span className="text-[10px] font-black text-[#1A1A2E] opacity-70 uppercase tracking-tighter">{label}</span>
    <span className="text-lg font-black text-[#1A1A2E]">{count}</span>
  </div>
);

export default Dashboard;
