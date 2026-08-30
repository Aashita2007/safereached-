import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routes_api import router as api_router

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SafeReached API",
    description="Smart Emergency Safety & Assistance Platform API",
    version="1.0.0"
)

# Enable CORS for local development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API Router
app.include_router(api_router)

# Mount Static Assets (CSS, JS, Static Files)
public_dir = os.path.join(os.path.dirname(__file__), "public")
css_dir = os.path.join(public_dir, "css")
js_dir = os.path.join(public_dir, "js")

os.makedirs(public_dir, exist_ok=True)
os.makedirs(css_dir, exist_ok=True)
os.makedirs(js_dir, exist_ok=True)

app.mount("/css", StaticFiles(directory=css_dir), name="css")
app.mount("/js", StaticFiles(directory=js_dir), name="js")
app.mount("/static", StaticFiles(directory=public_dir), name="static")

@app.get("/")
def serve_index():
    p1 = os.path.join(public_dir, "index.html")
    if os.path.isfile(p1):
        return FileResponse(p1)
    p2 = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.isfile(p2):
        return FileResponse(p2)
    for folder in [public_dir, os.path.dirname(__file__)]:
        if os.path.exists(folder):
            for fname in os.listdir(folder):
                if fname.lower() == "index.html":
                    return FileResponse(os.path.join(folder, fname))
    return JSONResponse({"status": "SafeReached Server Running", "docs": "/docs"})

@app.get("/{filename:path}")
def serve_public_file(filename: str):
    file_path = os.path.join(public_dir, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return JSONResponse({"error": "File not found"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    print("[SERVER] Starting SafeReached Emergency Platform Server...")
    print("[SERVER] Open URL in Browser: http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
