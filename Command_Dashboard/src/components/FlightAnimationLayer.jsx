import React, { useState, useEffect, useMemo } from 'react';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useSystemState } from '../context/SystemContext';

// Utility for Quadratic Bezier Curve Generation
const generateCurvePoints = (start, end, control, steps = 200) => {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * control[0] + Math.pow(t, 2) * end[0];
    const lng = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * control[1] + Math.pow(t, 2) * end[1];
    points.push([lat, lng]);
  }
  return points;
};

// Real-world Physics Parameters (Haversine Formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const FlightAnimationLayer = ({ mission }) => {
  const { alertLog, setAlertLog, setMapState, setTelemetry, activeMissions, setActiveMissions, activeMission } = useSystemState();

  if (!mission || !mission.startTime) return null;

  // Determine Mission Parameters
  let targetLat = 18.5204;
  let targetLng = 73.8567;
  let assignedUnit = 'Swargate Drone';

  if (mission.lat) {
    targetLat = mission.lat;
    targetLng = mission.lng;
    assignedUnit = mission.droneId;
  } else {
    const alert = alertLog.find(a => a.id === mission.id);
    if (alert && alert.location) {
      targetLat = alert.location[0];
      targetLng = alert.location[1];
      assignedUnit = alert.assignedUnit || 'Swargate Drone';
    }
  }

  // Base Station Coordinates
  let startPos = [18.5018, 73.8636];
  if (assignedUnit.includes('Shivaji')) startPos = [18.5314, 73.8446];
  else if (assignedUnit.includes('Hadapsar')) startPos = [18.5089, 73.9259];
  else if (assignedUnit.includes('Kothrud')) startPos = [18.5074, 73.8077];

  const endPos = [targetLat, targetLng];

  // Route Generation Strategy
  const { outbound, inbound } = useMemo(() => {
    const s = startPos;
    const e = endPos;
    const nfzCenter = [18.524344, 73.800499];
    const nfzRadiusKm = 1.25; // 1.2km circle + 50m safety buffer

    // Helper to calculate distance in KM
    const distToNFZ = (p) => getDistance(p[0], p[1], nfzCenter[0], nfzCenter[1]);

    // Helper to generate a perimeter-hugging path
    const generateSafePath = (start, end) => {
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      let control = [start[0] + dx * 0.5 - dy * 0.3, start[1] + dy * 0.5 + dx * 0.3];

      // Determine if the direct path crosses the NFZ
      let needsAvoidance = false;
      for (let t = 0; t <= 1; t += 0.1) {
        const p = [start[0] + t * dx, start[1] + t * dy];
        if (distToNFZ(p) < nfzRadiusKm) {
          needsAvoidance = true;
          break;
        }
      }

      if (needsAvoidance) {
        // Find a control point that creates a "half-circle/arc" around the edge
        // We push the control point away from NFZ center until the curve clears the radius
        let iterations = 0;
        let isSafe = false;
        while (!isSafe && iterations < 20) {
          isSafe = true;
          for (let t = 0; t <= 1; t += 0.05) {
            const p = [
              Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * control[0] + Math.pow(t, 2) * end[0],
              Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * control[1] + Math.pow(t, 2) * end[1]
            ];
            if (distToNFZ(p) < nfzRadiusKm) {
              isSafe = false;
              const pushDir = [control[0] - nfzCenter[0], control[1] - nfzCenter[1]];
              const mag = Math.sqrt(pushDir[0] ** 2 + pushDir[1] ** 2) || 1;
              // Larger steps to "hug" the edge better
              control[0] += (pushDir[0] / mag) * 0.006;
              control[1] += (pushDir[1] / mag) * 0.006;
              break;
            }
          }
          iterations++;
        }
      }
      return generateCurvePoints(start, end, control, 200);
    };

    return {
      outbound: generateSafePath(s, e),
      inbound: generateSafePath(e, s)
    };
  }, [startPos[0], startPos[1], endPos[0], endPos[1]]);

  // Physics State
  const [currentPos, setCurrentPos] = useState(startPos);
  const [phase, setPhase] = useState('EN_ROUTE');
  // Removing drawnRoute to stop "trail" effect

  // Time-based Physics Engine
  useEffect(() => {
    const distKm = getDistance(startPos[0], startPos[1], endPos[0], endPos[1]);
    const maxSpeedKmph = 120; // 120 km/h tactical cruise speed

    // Real-world flight time calculation: Time(h) = Dist(km) / Speed(km/h) -> Convert to MS
    const flightTimeMs = (distKm / maxSpeedKmph) * 3600 * 1000;

    const EN_ROUTE_MS = Math.max(3000, flightTimeMs); // Minimum 3s for extremely close flights
    const HOVER_MS = 6000; // Increased hover time for incident resolution
    const RTB_MS = EN_ROUTE_MS; // Return trip takes identical time
    const TOTAL_MS = EN_ROUTE_MS + HOVER_MS + RTB_MS;

    let hasClearedSOS = false;
    let initialBattery = 98; // Fresh spawn

    // Initial telemetry launch setup (ONLY for primary tracking mission)
    const isPrimary = (activeMission === mission.id) ||
      (!activeMission && activeMissions.length > 0 && activeMissions[activeMissions.length - 1].id === mission.id);

    if (isPrimary) {
      setTelemetry(prev => ({
        ...prev,
        speed: '0 kmph',
        eta: Math.ceil(EN_ROUTE_MS / 1000) + 's',
        battery: initialBattery
      }));
    }

    const physicsTick = setInterval(() => {
      const elapsedMs = Date.now() - mission.startTime;

      // Finish Mission
      if (elapsedMs >= TOTAL_MS) {
        clearInterval(physicsTick);
        setActiveMissions(prev => prev.filter(m => m.id !== mission.id));
        if (isPrimary) {
          setTelemetry(prev => ({ ...prev, speed: '0 kmph', eta: 'Landed' }));
        }
        return;
      }

      // Calculations
      const tick = Math.floor(elapsedMs / 100);
      let newPhase = 'EN_ROUTE';
      let pos = outbound[0];

      // 1. Outbound Leg
      if (elapsedMs < EN_ROUTE_MS) {
        newPhase = 'EN_ROUTE';
        const progress = elapsedMs / EN_ROUTE_MS;
        const idx = Math.min(199, Math.floor(progress * 200));
        pos = outbound[idx];

        if (tick % 10 === 0 && isPrimary) {
          // Dynamic acceleration physics (slowly ramp up to ~120 km/h, slight random variance)
          const currSpeed = progress < 0.1 ? (progress * 10 * 120) : (118 + Math.random() * 4);

          setTelemetry(prev => ({
            ...prev,
            speed: currSpeed.toFixed(1) + ' kmph',
            eta: Math.ceil((EN_ROUTE_MS - elapsedMs) / 1000) + 's',
            // Estimate battery drain: ranges from 100% to ~85% on a long 7km flight out
            battery: Math.max(0, initialBattery - Math.floor(progress * (distKm * 2.5)))
          }));
        }
      }
      // 2. Hover & Neutralize
      else if (elapsedMs < EN_ROUTE_MS + HOVER_MS) {
        newPhase = 'HOVER';
        pos = outbound[199];

        if (!hasClearedSOS) {
          hasClearedSOS = true;
          // Neutralize SOS Marker from Global Map!
          setMapState(prev => ({
            ...prev,
            markers: prev.markers.filter(m => m.type !== 'SOS_MARKER' && !m.id?.includes('SOS'))
          }));

          // Mark historical SOS log as RESOLVED (Incident neutralised!)
          setAlertLog(prev => prev.map(log =>
            log.id.includes('SOS') ? { ...log, status: 'RESOLVED' } : log
          ));
        }

        if (tick % 10 === 0 && isPrimary) {
          setTelemetry(prev => ({
            ...prev,
            speed: '0 kmph',
            eta: 'Hovering'
          }));
        }
      }
      // 3. Return To Base
      else {
        newPhase = 'RTB';
        const rtbElapsed = elapsedMs - EN_ROUTE_MS - HOVER_MS;
        const progress = rtbElapsed / RTB_MS;
        const idx = Math.min(199, Math.floor(progress * 200));
        pos = inbound[idx];

        if (tick % 10 === 0 && isPrimary) {
          const currSpeed = progress < 0.1 ? (progress * 10 * 120) : (118 + Math.random() * 4);
          setTelemetry(prev => ({
            ...prev,
            speed: currSpeed.toFixed(1) + ' kmph',
            eta: Math.ceil((RTB_MS - rtbElapsed) / 1000) + 's',
            battery: Math.max(0, initialBattery - (distKm * 2.5) - Math.floor(progress * (distKm * 2.5)))
          }));
        }
      }

      setCurrentPos(pos);
      setPhase(newPhase);
    }, 100);

    return () => clearInterval(physicsTick);
  }, [mission, outbound, inbound, setMapState, setTelemetry, setActiveMissions, activeMissions, activeMission]);

  // Visual Assets
  const hubIcon = L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/20"></div>
        <div class="w-8 h-8 rounded-full border border-cyan-400 bg-black/80 flex items-center justify-center shadow-[0_0_15px_#00e5ff]">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-drone-icon lucide-drone"><path d="M10 10 7 7"/><path d="m10 14-3 3"/><path d="m14 10 3-3"/><path d="m14 14 3 3"/><path d="M14.205 4.139a4 4 0 1 1 5.439 5.863"/><path d="M19.637 14a4 4 0 1 1-5.432 5.868"/><path d="M4.367 10a4 4 0 1 1 5.438-5.862"/><path d="M9.795 19.862a4 4 0 1 1-5.429-5.873"/><rect x="10" y="8" width="4" height="8" rx="1"/></svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <>
      {/* Full Intended Path: Dashed Line (No growing trail) */}
      <Polyline
        positions={phase === 'RTB' ? inbound : outbound}
        pathOptions={{ color: '#00e5ff', weight: 4, dashArray: '10, 15', opacity: 0.8, lineCap: 'round' }}
      />

      {/* If RTB, show the original outbound path as very faded */}
      {phase === 'RTB' && (
        <Polyline positions={outbound} pathOptions={{ color: '#00e5ff', weight: 2, dashArray: '5, 10', opacity: 0.2 }} />
      )}

      <Marker position={currentPos} icon={hubIcon} />
    </>
  );
};

export default FlightAnimationLayer;
