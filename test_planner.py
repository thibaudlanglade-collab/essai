"""
test_planner.py — End-to-end planner test.
Sends a PDF to the planner API, streams SSE events, and saves the
resulting Excel file to disk.

Usage:
    F:\\te\\.venv\\Scripts\\python.exe F:\\te\\test_planner.py
"""
import base64
import json
import mimetypes
import os
import uuid
from urllib.request import urlopen, Request
from urllib.error import URLError

# ── Config ────────────────────────────────────────────────────────────────────

API_URL   = "http://127.0.0.1:8000/api/execute_planner"
PDF_PATH  = r"C:\Users\Utilisateur\Downloads\FACTURE_652503_24122021_139112424.pdf"
OUT_PATH  = r"F:\te\test_output.xlsx"
USER_REQ  = "Extract all tables and data from this PDF and produce an Excel file"

# ── Multipart helpers ─────────────────────────────────────────────────────────

def _encode_multipart(fields: dict, files: dict) -> tuple[bytes, str]:
    """
    Build a multipart/form-data body.
    fields: {name: str_value}
    files:  {name: (filename, bytes, content_type)}
    Returns (body_bytes, content_type_header).
    """
    boundary = uuid.uuid4().hex
    parts = []

    for name, value in fields.items():
        parts.append(
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n'
            f"\r\n"
            f"{value}\r\n"
        )

    for name, (filename, data, ctype) in files.items():
        header = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
            f"Content-Type: {ctype}\r\n"
            f"\r\n"
        )
        parts.append(header.encode() + data + b"\r\n")

    body = b"".join(
        p.encode() if isinstance(p, str) else p for p in parts
    ) + f"--{boundary}--\r\n".encode()

    return body, f"multipart/form-data; boundary={boundary}"


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    # Read PDF
    if not os.path.exists(PDF_PATH):
        print(f"ERROR: PDF not found at {PDF_PATH}")
        return

    with open(PDF_PATH, "rb") as fh:
        pdf_bytes = fh.read()

    print(f"PDF loaded: {PDF_PATH} ({len(pdf_bytes):,} bytes)")
    print(f"Sending request to {API_URL} …\n")

    body, content_type = _encode_multipart(
        fields={"user_request": USER_REQ},
        files={"file": (os.path.basename(PDF_PATH), pdf_bytes, "application/pdf")},
    )

    req = Request(API_URL, data=body, method="POST")
    req.add_header("Content-Type", content_type)
    req.add_header("Accept", "text/event-stream")

    # Collected data for summary
    plan_steps   = []
    step_debugs  = {}
    final        = None
    events_seen  = []

    try:
        with urlopen(req, timeout=180) as resp:
            buffer = b""
            while True:
                chunk = resp.read(1)
                if not chunk:
                    break
                buffer += chunk
                # Process complete lines
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    line = line.decode("utf-8", errors="replace").rstrip("\r")
                    if not line.startswith("data:"):
                        continue
                    raw_json = line[len("data:"):].strip()
                    if raw_json == "[DONE]":
                        events_seen.append("[DONE]")
                        print("← [DONE]")
                        break
                    try:
                        event = json.loads(raw_json)
                    except json.JSONDecodeError:
                        continue

                    ev = event.get("event", "?")
                    events_seen.append(ev)
                    print(f"← {ev}")

                    if ev == "plan_created":
                        steps = event.get("plan", {}).get("steps", [])
                        plan_steps = [s["skill"] for s in steps]
                        print(f"   Plan: {' → '.join(plan_steps)}")

                    elif ev == "step_start":
                        print(f"   [{event.get('step')}] starting …")

                    elif ev == "step_done":
                        step = event.get("step")
                        debug = event.get("debug", {})
                        step_debugs[step] = debug
                        print(f"   [{step}] done — {debug}")

                    elif ev == "step_error":
                        print(f"   ERROR in [{event.get('step')}]: {event.get('error')}")

                    elif ev == "replanning":
                        print(f"   REPLANNING: {event.get('reason', '')}")

                    elif ev == "final_result":
                        final = event
                        rtype = event.get("result_type")
                        if rtype == "binary":
                            b64 = event.get("result_b64", "")
                            xlsx_bytes = base64.b64decode(b64)
                            with open(OUT_PATH, "wb") as out:
                                out.write(xlsx_bytes)
                            print(f"\n✓ Excel saved → {OUT_PATH} ({len(xlsx_bytes):,} bytes)")
                        elif rtype == "json":
                            snippet = str(event.get("result", ""))[:500]
                            print(f"   JSON result: {snippet}")
                        else:
                            print("   result_type: null / no output produced")

    except URLError as exc:
        print(f"Connection error: {exc}")
        print("Is the server running on port 8000?")
        return

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Plan:    {' → '.join(plan_steps) if plan_steps else '(none)'}")
    for step, debug in step_debugs.items():
        print(f"  {step}: {debug}")
    if final:
        rtype = final.get("result_type")
        print(f"Result:  {rtype}", end="")
        if rtype == "binary":
            b64 = final.get("result_b64", "")
            print(f", {len(base64.b64decode(b64)):,} bytes → {OUT_PATH}")
        else:
            print()
    print(f"Events:  {' → '.join(events_seen)}")


if __name__ == "__main__":
    main()
