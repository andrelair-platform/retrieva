"""Retrieva — **Multi-agent assessment system** (diagram-as-code).

The supervisor/worker (hierarchical) multi-agent topology: a DETERMINISTIC LangGraph-JS
supervisor in retrieva-backend (TypeScript) delegates the gap/assessment sub-task, over the
open **A2A** protocol (JSON-RPC 2.0 `message/send`), to a collaborative **CrewAI** crew of three
sequential agents in retrieva-assessment-crew (Python). Autonomy is bounded + human-gated: the
crew's output is PROPOSED, the supervisor's human gate decides.

Facts sourced from:
  retrieva-backend/services/orchestrator/assessmentGraph.ts   (LangGraph StateGraph supervisor)
  retrieva-backend/services/orchestrator/crewClient.ts         (A2A client — JSON-RPC message/send)
  retrieva-assessment-crew/src/retrieva_assessment_crew/crew.py (3 CrewAI agents, Process.sequential)
  retrieva-assessment-crew/src/retrieva_assessment_crew/app.py / executor.py (A2A server + Agent Card)

mingrammer `diagrams` + Graphviz. Self-contained; matches the dark-slate retrieva brand theme.

Run:  python retrieva_multiagent_system.py
Then: python embed-svg-images.py   (inline icons as base64 so the SVG renders standalone)
Out:  ../static/img/architecture/retrieva-multiagent-system.{png,svg}
"""
from __future__ import annotations

from pathlib import Path

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.onprem.client import User
from diagrams.onprem.database import PostgreSQL
from diagrams.programming.flowchart import (
    Action,
    Decision,
    InputOutput,
    PredefinedProcess,
)
from diagrams.programming.language import Python, Typescript

# ----------------------------------------------------------------- theme (inlined, brand-consistent)
SLATE, CYAN, GREEN, TEXT, MUTED, AMBER, VIOLET = (
    "#0f172a", "#22d3ee", "#34d399", "#e2e8f0", "#94a3b8", "#f59e0b", "#a78bfa",
)
ICONS = Path(__file__).resolve().parent / "icons"
OUT = Path(__file__).resolve().parent.parent / "static" / "img" / "architecture"
OUT.mkdir(parents=True, exist_ok=True)


def node(cls, label, icon=None):
    p = ICONS / icon if icon else None
    return Custom(label, str(p)) if p and p.exists() else cls(label)


def cl(pencolor=CYAN):
    return {"bgcolor": "#111c33", "pencolor": pencolor, "fontcolor": pencolor,
            "fontname": "Helvetica-Bold", "fontsize": "13", "style": "rounded", "penwidth": "1.6"}


GRAPH = {"bgcolor": SLATE, "fontcolor": TEXT, "fontname": "Helvetica", "fontsize": "20",
         "pad": "0.6", "nodesep": "0.55", "ranksep": "0.9", "splines": "spline"}
NODE = {"fontcolor": TEXT, "fontname": "Helvetica", "fontsize": "11"}
EDGE = {"color": MUTED, "fontcolor": MUTED, "fontname": "Helvetica", "fontsize": "9"}


def flow(label="", color=CYAN):
    return Edge(label=label, color=color, fontcolor=MUTED)


def dep(label="", color=MUTED):
    return Edge(label=label, color=color, fontcolor=MUTED, style="dashed")


with Diagram(
    "Retrieva — Multi-agent assessment system  ·  supervisor / workers over A2A",
    filename=str(OUT / "retrieva-multiagent-system"),
    outformat=["png", "svg"],
    direction="LR",
    show=False,
    graph_attr=GRAPH,
    node_attr=NODE,
    edge_attr=EDGE,
):
    owner = User("Compliance owner\nstarts · approves")

    # ---------------- Runtime A: the supervisor (TypeScript) ----------------
    with Cluster("retrieva-backend  ·  TypeScript", graph_attr=cl(CYAN)):
        Typescript("runtime")
        with Cluster("SUPERVISOR — LangGraph-JS StateGraph (deterministic routing)", graph_attr=cl(GREEN)):
            intake = Action("intake")
            gate = Decision("human gate\ninterrupt()")
            gap = PredefinedProcess("gap node\n(delegated)")
            findings = Action("findings")
            intake >> flow() >> gate >> flow("approved") >> gap >> flow() >> findings
        a2a_client = InputOutput("A2A client\ncrewClient.ts\nJSON-RPC message/send")
        gap >> flow("delegate assessment") >> a2a_client

    # ---------------- Runtime B: the collaborative crew (Python) ----------------
    with Cluster("retrieva-assessment-crew  ·  Python", graph_attr=cl(VIOLET)):
        Python("runtime")
        a2a_server = InputOutput("A2A server\napp.py · executor.py\nAgent Card /.well-known")
        with Cluster("CREW — CrewAI · Process.sequential  (bounded autonomy, output PROPOSED)", graph_attr=cl(AMBER)):
            a1 = PredefinedProcess("Agent 1\nDORA clause mapper")
            a2 = PredefinedProcess("Agent 2\nDORA gap analyst")
            a3 = PredefinedProcess("Agent 3\nDORA control scorer")
            a1 >> flow() >> a2 >> flow() >> a3
        a2a_server >> flow("run crew") >> a1

    # ---------------- Backing dependencies (LLMOps / data) ----------------
    with Cluster("LLMOps · evidence · durability", graph_attr=cl(GREEN)):
        litellm = node(PredefinedProcess, "LiteLLM\nLLM gateway", icon="litellm.png")
        qdrant = node(PredefinedProcess, "Qdrant\nevidence (RAG)", icon="qdrant.png")
        checkpoint = PostgreSQL("Postgres checkpointer\nresumable runs")
        trace = node(PostgreSQL, "Langfuse\nper-run trace + spans", icon="langfuse.png")

    # ---------------- cross-runtime A2A link (the multi-agent seam) ----------------
    a2a_client >> flow("A2A JSON-RPC 2.0\nmessage/send (request)", AMBER) >> a2a_server
    a2a_server >> dep("response: proposed verdicts\n(never authoritative)", AMBER) >> a2a_client

    # ---------------- human-in-the-loop governance ----------------
    owner >> flow("assess / approve", "#60a5fa") >> gate
    gate >> dep("interrupt: waiting on you", AMBER) >> owner

    # ---------------- backing flows ----------------
    a2 >> dep("routes-to-LLM", VIOLET) >> litellm
    a3 >> dep("routes-to-LLM", VIOLET) >> litellm
    a1 >> dep("retrieves evidence", VIOLET) >> qdrant
    intake >> dep("checkpoint", VIOLET) >> checkpoint
    findings >> dep("trace", VIOLET) >> trace
    a2a_server >> dep("spans", VIOLET) >> trace
