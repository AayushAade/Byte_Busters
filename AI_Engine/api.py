import os
import uuid
import shutil
import requests
import time
import json
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- AI CONFIGURATION ---
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("⚠️ google-genai not found. Please run: pip install google-genai")

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY", "Api")
client = genai.Client(api_key=api_key) if api_key else None

app = FastAPI(title="SkyNetra AI Engine", description="Video Analysis using Gemini")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEO_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'video_input')
os.makedirs(VIDEO_UPLOAD_FOLDER, exist_ok=True)

COMMAND_CENTER_URL = "http://127.0.0.1:5001/report_evidence"

def send_alert_to_command_center(payload: dict):
    try:
        requests.post(COMMAND_CENTER_URL, json=payload)
    except Exception as e:
        print(f"⚠️ Relay error: {e}")

def process_video_gemini(video_path: str, camera_id: str):
    video_name = os.path.basename(video_path)
    print(f"▶️ [SCAN START] Analyzing via Gemini: {video_name} from {camera_id}")
    
    if not client:
        print("❌ GEMINI_API_KEY is missing. Cannot process video.")
        return
        
    try:
        # 1. Upload Video
        print(f"☁️ Uploading {video_name} to Google Gemini...")
        video_file = client.files.upload(file=video_path)
        
        # 2. Wait for processing
        print("⏳ Waiting for video processing (this may take a minute)...")
        while video_file.state.name == "PROCESSING":
            time.sleep(3)
            video_file = client.files.get(name=video_file.name)
            
        if video_file.state.name == "FAILED":
            print(f"❌ Gemini processing failed state for {video_name}")
            return
            
        # 3. Generate Content
        print("🧠 Running AI Inference...")
        prompt = """Analyze this surveillance video for urban safety threats.
Look specifically for: accidents, abandoned suspicious objects, fights, 
sudden crowd formation, fire, emergency conditions, fallen person, or similar cases.

Calculate the severity score realistically from 0 to 100 based on the threat. Provide a brief description of what exactly has happened in the video.

Provide the response strictly as a JSON object with the following fields:
- "incident_detected": true if an incident is found, false otherwise.
- "incident_type": Short category name (e.g. "Traffic Collision", "Fallen Person") or "None".
- "severity_score": Integer from 0 to 100 representing the threat level.
- "description": A brief description of what exactly happened in the video.
- "drone_dispatch_necessary": boolean, ALWAYS set to true if an accident, emergency, or severity > 50 is detected.
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[video_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        print(f"✅ AI Inference Complete for {video_name}")
        
        # Cleanup
        try:
            client.files.delete(name=video_file.name)
        except Exception as cleanup_err:
            print(f"⚠️ Could not delete cloud file: {cleanup_err}")
            
        # 4. Parse Response
        try:
            data = json.loads(response.text)
        except Exception as json_err:
            print(f"⚠️ Unexpected JSON breakdown: {json_err}. Raw output: {response.text}")
            data = {
                "incident_detected": False,
                "severity_score": 10,
                "description": "Parser failed to read response.",
                "drone_dispatch_necessary": False
            }
            
        print(f"📊 Gemini Output: {json.dumps(data, indent=2)}")
        
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        severity_val = data.get("severity_score", 10)
        dispatch_needed = data.get("drone_dispatch_necessary", False) or (severity_val > 50)
        
        # 5. Alert Trigger rules
        if dispatch_needed:
            print("🚨 CRITICAL: Drone Dispatch Recommended by AI!")
            # Trigger active drone deployment
            payload = {
                "camera_id": camera_id,
                "severity": severity_val if severity_val > 50 else 85,
                "priority": "CRITICAL",
                "description": f"AI ANALYSIS ({data.get('incident_type', 'Emergency')}): {data.get('description', 'Dispatch required')}",
                "timestamp": timestamp
            }
            send_alert_to_command_center(payload)
            
            # Give UI a second to process CRITICAL payload before issuing the final summary overlay
            print("⏳ Pausing briefly to allow Command Center to dispatch drone...")
            time.sleep(1.5)
            
        # 6. Inform summary completion
        summary_payload = {
            "camera_id": camera_id,
            "severity": data.get("severity_score", 10) if dispatch_needed else (10 if not data.get("incident_detected") else data.get("severity_score", 30)),
            "priority": "FINAL_SUMMARY",
            "description": f"MISSION COMPLETE: Analysis for {video_name} is finished. AI reported: {data.get('description', 'No threats')}.",
            "timestamp": timestamp
        }
        send_alert_to_command_center(summary_payload)

    except Exception as e:
        print(f"❌ Error during Gemini processing: {e}")


@app.post("/upload_video")
async def analyze_video(
    background_tasks: BackgroundTasks, 
    video: UploadFile = File(...),
    camera_id: str = Form("UNKNOWN_CAM")
):
    if not video.filename:
        return JSONResponse(status_code=400, content={"message": "No file uploaded"})
        
    ext = os.path.splitext(video.filename)[1]
    unique_filename = f"{camera_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(VIDEO_UPLOAD_FOLDER, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    background_tasks.add_task(process_video_gemini, file_path, camera_id)
    
    return JSONResponse(status_code=200, content={
        "status": "SUCCESS",
        "message": f"Video successfully received from {camera_id}. Gemini AI Analysis started.",
        "filename": unique_filename,
        "filepath": file_path
    })

if __name__ == '__main__':
    import uvicorn
    print("\n" + "╔" + "═"*48 + "╗")
    print("║  🚀 AI INFERENCE ENGINE — FASTAPI (PORT 5002)   ║")
    print("║  Google Gemini Video Understanding Pipeline     ║")
    print("╚" + "═"*48 + "╝\n")
    uvicorn.run("api:app", host="0.0.0.0", port=5002, reload=True)
