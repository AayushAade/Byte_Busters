import os
import math
import random
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from google import genai
from dotenv import load_dotenv

# --- 1. INITIALIZE FLASK APP ---
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- 2. LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

# --- 3. AI CONFIGURATION ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file!")
    
client = genai.Client(api_key=api_key) if api_key else None

# --- 4. STATIC FILE SERVING ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- 5. DRONE FLEET & DISTANCE LOGIC ---
# Shared state for simulation
DRONE_FLEET = [
    {"id": "Swargate Drone", "name": "Swargate Station", "lat": 18.5018, "lng": 73.8636, "status": "AVAILABLE", "battery": 100, "current_severity": 0},
    {"id": "Shivaji Nagar Drone", "name": "Shivaji Nagar Station", "lat": 18.5314, "lng": 73.8446, "status": "AVAILABLE", "battery": 80, "current_severity": 0},
    {"id": "Hadapsar Drone", "name": "Hadapsar Station", "lat": 18.5089, "lng": 73.9259, "status": "AVAILABLE", "battery": 45, "current_severity": 0},
    {"id": "Kothrud Drone", "name": "Kothrud Station", "lat": 18.5074, "lng": 73.8077, "status": "AVAILABLE", "battery": 90, "current_severity": 0}
]

# Circular No-Fly Zones: (lat, lng, radius_km)
CIRCULAR_NO_FLY_ZONES = [
    {"id": "GREEN_HILL", "lat": 18.524344, "lng": 73.800499, "radius": 1.2} # 1200m radius
]

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371 # Earth radius in km
    try:
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except:
        return 0

def line_intersects_circle(p1, p2, circle_center, radius):
    """Checks if line segment p1-p2 intersects/crosses a circle."""
    x1, y1 = p1
    x2, y2 = p2
    cx, cy = circle_center
    
    # Vector from p1 to p2
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return calculate_distance(x1, y1, cx, cy) <= radius

    # Projection of circle center onto the line p1-p2
    t = ((cx - x1) * dx + (cy - y1) * dy) / (dx*dx + dy*dy)
    t = max(0, min(1, t)) # Clamp to segment
    
    closest_x = x1 + t * dx
    closest_y = y1 + t * dy
    
    dist = calculate_distance(closest_x, closest_y, cx, cy)
    return dist <= radius

def check_detour_distance(lat1, lon1, lat2, lon2):
    base_dist = calculate_distance(lat1, lon1, lat2, lon2)
    p1, p2 = (lat1, lon1), (lat2, lon2)
    
    for zone in CIRCULAR_NO_FLY_ZONES:
        if line_intersects_circle(p1, p2, (zone['lat'], zone['lng']), zone['radius']):
            # High penalty to force avoidance if other drones are available
            return base_dist * 5.0 
    return base_dist

def dispatch_drone(user_lat, user_lng, incoming_severity):
    min_dist, best_drone = float('inf'), None
    for drone in DRONE_FLEET:
        if drone['battery'] <= 25:
            continue # Battery Constraint
        
        # Pre-emption Logic Disabled for testing -> Always available for UI demonstrations
        is_available = True
        is_preemptable = False
        
        if is_available or is_preemptable:
            dist = check_detour_distance(user_lat, user_lng, drone['lat'], drone['lng'])
            if dist < min_dist:
                min_dist, best_drone = dist, drone
                
    if best_drone:
        best_drone['status'] = 'DISPATCHED'
        best_drone['current_severity'] = incoming_severity
    return best_drone, min_dist

# Drone background simulation thread
def drone_simulation_loop():
    while True:
        try:
            active_count = 0
            charging_count = 0
            ready_count = 0
            
            for drone in DRONE_FLEET:
                if drone['status'] == 'DISPATCHED':
                    drone['battery'] -= max(0.5, random.uniform(0.1, 0.8)) # Drain battery faster when active
                    active_count += 1
                    # After 30 seconds of being dispatched, simulate task complete
                    if random.random() < 0.1: 
                        drone['status'] = 'AVAILABLE'
                        drone['current_severity'] = 0
                else:
                    if drone['battery'] < 100:
                        drone['status'] = 'CHARGING'
                        drone['battery'] = min(100.0, drone['battery'] + 0.5) # Recharge when idle
                        charging_count += 1
                    else:
                        drone['status'] = 'AVAILABLE'
                        ready_count += 1
                        
            # Emit live fleet status to the UI once per tick
            socketio.emit('fleet_update', {
                'active': active_count,
                'charging': charging_count,
                'ready': ready_count
            })
        except Exception as e:
            print(f"Simulation loop error: {e}")
            
        time.sleep(5)

threading.Thread(target=drone_simulation_loop, daemon=True).start()

# --- WebSocket Events (Optional but good for debugging) ---
@socketio.on('connect')
def handle_connect():
    print("✅ Dashboard connected to Python SocketIO!")

@socketio.on('disconnect')
def handle_disconnect():
    print("❌ Dashboard disconnected")

# --- 6. ENDPOINT A: MOBILE APP SOS TRIGGER ---
@app.route('/sos_trigger', methods=['POST'])
def handle_sos():
    sos_data = request.json
    user_lat = sos_data.get('lat')
    user_lng = sos_data.get('lng')
    incident_type = sos_data.get('type', 'GENERAL_EMERGENCY')
    manual_note = sos_data.get('description', '')
    
    # We do NOT dispatch drones immediately here!
    # Await Gemini video proof.
    print(f"📡 SOS Alert received from mobile at [{user_lat}, {user_lng}] for {incident_type}. Awaiting media...")
    
    try:
        # 1. Update Map UI with SOS Ping
        socketio.emit('ui_pulse_location', {
            "lat": user_lat,
            "lng": user_lng,
            "type": incident_type
        })
        
        # 2. Push to Active Service Calls panel natively
        socketio.emit('cctv_anomaly', {
            "id": f"SOS-{int(datetime.utcnow().timestamp())}",
            "label": f"SOS: {incident_type}",
            "confidence": 0.50, # Initial confidence before AI
            "location": [user_lat, user_lng],
            "description": f"Manual Interface Trigger: {manual_note}. Awaiting media evidence for drone dispatch authorization." if manual_note else "Emergency SOS signal triggered manually. Awaiting video evidence.",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        print("📡 Successfully emitted UI alerts to dashboard!")
        return jsonify({
            "status": "SUCCESS", 
            "message": "SOS pulse sent. Upload video evidence for drone authorization."
        }), 200
        
    except Exception as e:
        print(f"⚠️ Socket Emission failed: {e}")
        return jsonify({"status": "ERROR", "message": str(e)}), 500


CAM_LOCATIONS = {
    "CAM_PUN_01": [18.4529, 73.8588], # Katraj Junction
    "CAM_PUN_02": [18.5018, 73.8636], # Swargate Square
    "CAM_PUN_03": [18.5314, 73.8446], # Shivajinagar Station
    "CAM_PUN_04": [18.5074, 73.8077], # Kothrud Stand
    "CAM_PUN_05": [18.5158, 73.8415], # Deccan Gymkhana
    "CAM_PUN_06": [18.5913, 73.7389], # Hinjewadi 
    "CAM_PUN_07": [18.5590, 73.7868], # Baner
    "CAM_PUN_08": [18.5515, 73.9348], # Kharadi
    "CAM_PUN_09": [18.5679, 73.9143], # Viman Nagar
    "CAM_PUN_10": [18.5987, 73.7664]  # Wakad
}

# --- 7. ENDPOINT B: EDGE AI VIDEO TRIGGER ---
@app.route('/report_evidence', methods=['POST'])
def handle_evidence():
    report_data = request.json
    camera_id = report_data.get('camera_id', 'UNKNOWN_CAM')
    severity_score = int(report_data.get('severity', 50))
    priority = report_data.get('priority', 'HIGH')
    description = report_data.get('description', 'Evidence received from field.')
    
    print("\n" + "="*50)
    print(f"📹 EDGE AI MEDIA ALERT RECEIVED FROM {camera_id}!")
    print(f"Priority Level: {priority}")
    print(f"Severity Score: {severity_score}/100")
    print(f"AI Summary: {description}")
    
    # Get Location: Favor dynamically provided coords from Mobile App, otherwise CCTV map
    provided_lat = report_data.get('lat')
    provided_lng = report_data.get('lng')
    
    if provided_lat is not None and provided_lng is not None:
        lat, lng = float(provided_lat), float(provided_lng)
    else:
        cam_coords = CAM_LOCATIONS.get(camera_id, [18.5204, 73.8567])
        lat, lng = cam_coords[0], cam_coords[1]
    
    # AI trigger condition: user requested dispatch even if severity is just above 50
    if severity_score > 50 and priority != "FINAL_SUMMARY":
        best_drone, dist = dispatch_drone(lat, lng, severity_score)
        drone_id = best_drone['id'] if best_drone else "NO DRONES AVAILABLE"
        print(f"🚁 Confirming AI Dispatch: {drone_id} to [{lat:.4f}, {lng:.4f}]")

        # ── EMIT DIRECTLY TO DASHBOARD OVER SOCKETIO ──
        try:
            # 1. Update Intel Brief
            socketio.emit('update_intel_brief', {
                "report": {
                    "severity": severity_score,
                    "priority": priority,
                    "description": description,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            })
            
            # 2. Tell Map to blink at incident location
            incident_type = "AI " + description.split("identified")[0].replace("URGENT:", "").strip() if "identified" in description else "AI Video Alert"
            socketio.emit('ui_pulse_location', {
                "lat": lat,
                "lng": lng,
                "type": incident_type,
                "user": camera_id,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
            
            # 3. Open the Deploy Modal with drone info to trigger auto-deploy
            display_dist = round(dist, 2) if dist != float('inf') else 0
            socketio.emit('trigger_deploy_prompt', {
                "droneId": drone_id,
                "distance": display_dist,
                "lat": lat,
                "lng": lng,
                "type": incident_type,
                "user": camera_id
            })
            
            # 4. Push to Active Service Calls log
            socketio.emit('cctv_anomaly', {
                "id": f"AI-{int(datetime.utcnow().timestamp())}",
                "label": incident_type,
                "confidence": severity_score / 100,
                "location": [lat, lng],
                "description": description,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
            
            print("📡 AI Dispatch events emitted to dashboard successfully!")
        except Exception as e:
            print(f"⚠️ Socket Emission failed: {e}")
    else:
        # Final Summary or Low Severity logic
        try:
            socketio.emit('update_intel_brief', {
                "report": {
                    "severity": severity_score,
                    "priority": priority,
                    "description": description,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            })
            print("📡 Standard Intel Brief emitted to dashboard!")
        except Exception as e:
            print(f"⚠️ Socket Emission failed: {e}")

    print("="*50 + "\n")
    
    return jsonify({"status": "Command Center Received Media Report"}), 200

# --- 8. UPLOAD VIDEO ENDPOINT (MOVED TO AI_ENGINE:5002) ---
# The video upload endpoint and disk writing logic has been relocated 
# to AI_Engine/api.py so it can be handled directly by the AI inference layer.

# --- 9. START SERVER ---
if __name__ == '__main__':
    print("\n" + "╔" + "═"*48 + "╗")
    print("║  📡 GUARDIAN AI COMMAND CENTER — PORT 5001      ║")
    print("║  Flask API + SocketIO + Gemini AI Active        ║")
    print("╚" + "═"*48 + "╝\n")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=False)