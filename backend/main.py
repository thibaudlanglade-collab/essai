from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from features import registry
from api.features import router as features_router
from api.execute import router as execute_router
from api.execute_planner import router as execute_planner_router
from api.execute_team_planner import execute_team_planner_router
from api.debug import router as debug_router
from api.employees import employees_router
from api.gmail_auth import gmail_auth_router
from api.emails import emails_router
from api.email_topics import email_topics_router
from api.automations import automations_router
from auth.routes import router as auth_router
from services.gmail_sync import start_scheduler, stop_scheduler
from db.database import async_session_maker, init_db
from db.seed_topics import seed_default_topics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise the SQLite database (creates tables + safe migrations)
    await init_db()
    # Seed default email topics on first run
    async with async_session_maker() as db:
        await seed_default_topics(db)
    # Start the Gmail polling + AI scheduler
    await start_scheduler()
    # Load all feature declarations at startup
    registry.load_all()

    # Phase G: initialise automation engine + trigger manager
    from services.gmail_sync import _scheduler
    from services.automation_engine import AutomationEngine
    from services.automation_triggers import TriggerManager, set_trigger_manager

    engine = AutomationEngine()
    trigger_manager = TriggerManager(scheduler=_scheduler, engine=engine)
    set_trigger_manager(trigger_manager)

    # Register all active automations
    async with async_session_maker() as db:
        await trigger_manager.refresh_all(db)

    yield

    # Graceful shutdown
    trigger_manager.stop_all_watchers()
    await stop_scheduler()


app = FastAPI(title="Workflow Engine", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router — must be included BEFORE the SPA catch-all so that
# `/app/{token}` and `/expired` are not swallowed by `index.html`.
# No `/api` prefix: this router owns both root-level pages and `/api/auth/*`.
app.include_router(auth_router)

app.include_router(features_router, prefix="/api")
app.include_router(execute_router, prefix="/api")
app.include_router(execute_planner_router, prefix="/api")
app.include_router(execute_team_planner_router, prefix="/api")
app.include_router(debug_router, prefix="/api")
app.include_router(employees_router, prefix="/api")
app.include_router(gmail_auth_router, prefix="/api")
app.include_router(emails_router, prefix="/api")
app.include_router(email_topics_router, prefix="/api")
app.include_router(automations_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---------- Serve frontend static files in production ----------
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (_frontend_dist / "assets").is_dir():
    from fastapi.responses import FileResponse

    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=_frontend_dist / "assets"), name="assets")

    # Catch-all: serve index.html for any non-API route (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = _frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_frontend_dist / "index.html")
