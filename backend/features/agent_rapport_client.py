"""
Feature: Agent Rapport client (wizard mode)

Two-stage flow driven by the wizard UI:

  Stage 1 — `ingest_data` only
      Called synchronously by `POST /api/agent-rapport/ingest`. Turns the
      prospect's raw input (text / csv / pdf chunks) into a structured
      ClientContext + a short summary the user reviews before continuing.

  Stage 2 — `interpret_intent` then `compose_report`
      Called via SSE by `POST /api/agent-rapport/compose`. Takes the
      ClientContext + the prospect's intent text and produces the
      flexible report payload rendered by AgentRapportPage.

This file declares the canonical pipeline so the registry and downstream
consumers see the full ordered list. The endpoint runs the relevant
slice depending on the stage.
"""
from skills.agent_rapport import (
    compose_report,
    ingest_data,
    interpret_intent,
)

FEATURE = {
    "id": "agent_rapport_client",
    "name": "Agent Rapport client",
    "description": "Compile un rapport sur-mesure à partir des données fournies par l'utilisateur",
    "input_type": "json",
    "output_type": "json",
    "pipeline": [
        ingest_data,
        interpret_intent,
        compose_report,
    ],
}
