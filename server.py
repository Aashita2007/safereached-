import os
from fastapi import FastAPI
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

# Define directories
root_dir = os.path.dirname(__file__)
public_dir = os.path.join(root_dir, "public")
css_dir = os.path.join(public_dir, "css")
js_dir = os.path.join(public_dir, "js")

def find_file_in_tree(target_name: str) -> str:
    """Helper to locate any asset (style.css, app.js, images) anywhere in root or public folder."""
    base_name = os.path.basename(target_name)
    search_paths = [
        os.path.join(public_dir, "css", base_name),
        os.path.join(public_dir, "js", base_name),
        os.path.join(public_dir, base_name),
        os.path.join(root_dir, "css", base_name),
        os.path.join(root_dir, "js", base_name),
        os.path.join(root_dir, base_name),
        os.path.join(public_dir, target_name),
        os.path.join(root_dir, target_name),
    ]
    for p in search_paths:
        if os.path.isfile(p):
            return p
    return None

@app.get("/")
def serve_index():
    index_path = find_file_in_tree("index.html")
    if index_path:
        return FileResponse(index_path)
    return JSONResponse({"status": "SafeReached Server Running", "docs": "/docs"})

@app.get("/css/{filename:path}")
def serve_css_assets(filename: str):
    found = find_file_in_tree(filename)
    if found:
        return FileResponse(found, media_type="text/css")
    return JSONResponse({"error": "CSS not found"}, status_code=404)

@app.get("/js/{filename:path}")
def serve_js_assets(filename: str):
    found = find_file_in_tree(filename)
    if found:
        return FileResponse(found, media_type="application/javascript")
    return JSONResponse({"error": "JS not found"}, status_code=404)

@app.get("/{filename:path}")
def serve_any_file(filename: str):
    found = find_file_in_tree(filename)
    if found:
        media_type = None
        if filename.endswith(".css"): media_type = "text/css"
        elif filename.endswith(".js"): media_type = "application/javascript"
        elif filename.endswith(".jpg") or filename.endswith(".jpeg"): media_type = "image/jpeg"
        elif filename.endswith(".png"): media_type = "image/png"
        return FileResponse(found, media_type=media_type)
    return JSONResponse({"error": "File not found"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    print("[SERVER] Starting SafeReached Emergency Platform Server...")
    print("[SERVER] Open URL in Browser: http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
