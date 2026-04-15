"""
Service: watch_folder_service
Purpose: Monitor a folder for new files using watchdog.
         Designed to be used by the Phase G automation engine.
         NOT a skill — a reusable background service.
"""
from __future__ import annotations

import asyncio
import logging
import threading
from pathlib import Path
from typing import Callable, Coroutine, Any

logger = logging.getLogger(__name__)


class FolderWatcher:
    """
    Watches a folder for newly created files and calls an async callback.

    Usage:
        async def on_new_file(path: str) -> None:
            print(f"New file: {path}")

        watcher = FolderWatcher("/path/to/folder", on_new_file, file_extensions=[".pdf"])
        watcher.start()
        # ... later ...
        watcher.stop()
    """

    def __init__(
        self,
        folder_path: str,
        callback: Callable[[str], Coroutine[Any, Any, None]],
        file_extensions: list[str] | None = None,
        debounce_seconds: float = 2.0,
    ):
        """
        folder_path: absolute path to monitor (created if missing)
        callback: async function called with the new file's path
        file_extensions: optional whitelist e.g. [".pdf", ".docx"]. None = all files.
        debounce_seconds: delay before triggering callback (lets file finish writing)
        """
        self._folder = Path(folder_path)
        self._callback = callback
        self._extensions = (
            {ext.lower() for ext in file_extensions} if file_extensions else None
        )
        self._debounce = debounce_seconds
        self._observer = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._seen: set[str] = set()
        self._pending_timers: dict[str, threading.Timer] = {}
        self._lock = threading.Lock()

    def start(self) -> None:
        """Start watching. Non-blocking. Captures the current event loop."""
        from watchdog.observers import Observer  # type: ignore[import]
        from watchdog.events import FileSystemEventHandler  # type: ignore[import]

        # Auto-create the watched folder if missing
        self._folder.mkdir(parents=True, exist_ok=True)

        # Capture the running event loop so we can schedule coroutines from the watchdog thread
        try:
            self._loop = asyncio.get_event_loop()
        except RuntimeError:
            self._loop = None

        watcher = self

        class _Handler(FileSystemEventHandler):
            def on_created(self, event):  # type: ignore[override]
                if event.is_directory:
                    return
                file_path = str(event.src_path)
                ext = Path(file_path).suffix.lower()

                if watcher._extensions is not None and ext not in watcher._extensions:
                    return

                with watcher._lock:
                    if file_path in watcher._seen:
                        return
                    # Cancel any pending duplicate timer for the same path
                    existing = watcher._pending_timers.pop(file_path, None)
                    if existing:
                        existing.cancel()

                def _fire():
                    with watcher._lock:
                        if file_path in watcher._seen:
                            watcher._pending_timers.pop(file_path, None)
                            return
                        watcher._seen.add(file_path)
                        watcher._pending_timers.pop(file_path, None)

                    logger.info("FolderWatcher: new file detected: %s", file_path)

                    loop = watcher._loop
                    if loop is not None and loop.is_running():
                        asyncio.run_coroutine_threadsafe(
                            watcher._callback(file_path), loop
                        )
                    else:
                        # Fallback: run in a new event loop
                        try:
                            asyncio.run(watcher._callback(file_path))
                        except Exception as exc:
                            logger.error(
                                "FolderWatcher callback error: %s", exc
                            )

                timer = threading.Timer(watcher._debounce, _fire)
                with watcher._lock:
                    watcher._pending_timers[file_path] = timer
                timer.start()

        self._observer = Observer()
        self._observer.schedule(_Handler(), str(self._folder), recursive=False)
        self._observer.start()
        logger.info(
            "FolderWatcher started: watching '%s' (extensions=%s, debounce=%.1fs)",
            self._folder,
            self._extensions,
            self._debounce,
        )

    def stop(self) -> None:
        """Stop watching gracefully and cancel pending timers."""
        with self._lock:
            for timer in self._pending_timers.values():
                timer.cancel()
            self._pending_timers.clear()

        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=5)
            self._observer = None
            logger.info("FolderWatcher stopped: '%s'", self._folder)

    @property
    def folder(self) -> Path:
        return self._folder

    @property
    def is_running(self) -> bool:
        return self._observer is not None and self._observer.is_alive()


# ── Quick test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import tempfile
    import time

    logging.basicConfig(level=logging.INFO)

    async def on_file(path: str) -> None:
        print(f"[TEST] Nouveau fichier détecté: {path}")

    with tempfile.TemporaryDirectory() as tmp:
        watcher = FolderWatcher(tmp, on_file, debounce_seconds=1.0)
        watcher.start()
        print(f"Watching: {tmp}")
        print("Créez un fichier dans ce dossier pour tester...")
        time.sleep(15)
        watcher.stop()
        print("Terminé.")
