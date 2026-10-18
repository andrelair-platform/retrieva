"""Retrieva — **How an assessment flows** (diagram-as-code) for the docs landing page.

The agentic, human-gated assessment spine: build the register → run the LangGraph supervisor
(delegating gap analysis to a CrewAI crew over A2A) → human decides (decision inbox / approval
center) → projections + export. Icon-based replacement for the ASCII flow in docs/intro.md.

mingrammer `diagrams` + Graphviz (uses the built-in flowchart shapes + brand icons). Self-contained.
Facts sourced from retrieva-backend/services/orchestrator/*, decisionQueue/*, intake/*, and the frontend
features (arrangements, assessment-runs, approval-center, decision-inbox, concentration, risk-register).

Run:  python retrieva_assessment_flow.py
Then: python embed-svg-images.py   (inline icons as base64 so the SVG renders standalone)
Out:  ../static/img/architecture/retrieva-assessment-flow.{png,svg}
"""
from __future__ import annotations

from pathlib import Path

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.onprem.database import PostgreSQL
from diagrams.programming.flowchart import (
    Action,
    Database,
    Decision,
    Document,
    InputOutput,
    ManualInput,
    MultipleDocuments,
    PredefinedProcess,
)

# ----------------------------------------------------------------- theme (inlined)
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
         "pad": "0.6", "nodesep": "0.5", "ranksep": "0.85", "splines": "spline"}
NODE = {"fontcolor": TEXT, "fontname": "Helvetica", "fontsize": "11"}
EDGE = {"color": MUTED, "fontcolor": MUTED, "fontname": "Helvetica", "fontsize": "9"}


def flow(label="", color=CYAN):
    return Edge(label=label, color=color, fontcolor=MUTED)


def dep(label="", color=MUTED):
    return Edge(label=label, color=color, fontcolor=MUTED, style="dashed")


with Diagram(
    "Retrieva — How an assessment flows  ·  agentic · human-gated",
    filename=str(OUT / "retrieva-assessment-flow"),
    outformat=["png", "svg"],
    direction="TB",
    show=False,
    graph_attr=GRAPH,
    node_attr=NODE,
    edge_attr=EDGE,
):
    with Cluster("1 · Build the register", graph_attr=cl(GREEN)):
        imp = Document("Contract / estate import\nPDF · DOCX · CSV/XLSX")
        propose = Action("AI-proposed arrangement\ncontractExtractionService")
        confirm = ManualInput("Human confirms")
        roi = Database("Register of Information\narrangements · RT.02.01")
        imp >> flow() >> propose >> dep("human-confirmed") >> confirm >> flow() >> roi

    with Cluster("2 · Assessment run  ·  LangGraph supervisor (deterministic)", graph_attr=cl(CYAN)):
        intake = Action("intake")
        gate = Decision("human gate")
        gap = PredefinedProcess("gap analysis\nCrewAI crew · A2A")
        findings = Action("findings")
        intake >> flow() >> gate >> flow("approved") >> gap >> flow() >> findings
        checkpoint = PostgreSQL("Postgres checkpointer\nresumable runs")
        trace = node(PostgreSQL, "Langfuse\nper-run trace", icon="langfuse.png")
        intake >> dep("checkpoint", VIOLET) >> checkpoint
        findings >> dep("trace", VIOLET) >> trace

    with Cluster("3 · Human-in-the-loop governance", graph_attr=cl(AMBER)):
        hitl = InputOutput(
            "Decision inbox  ·  Approval center\nAI drafts · human approves / edits / rejects\n"
            "separation-of-duties · live over Socket.io"
        )

    with Cluster("4 · Outputs", graph_attr=cl(GREEN)):
        proj = Document("Register projection")
        risk = Document("Risk register")
        conc = Document("Concentration graph\nnth-party risk")
        export = MultipleDocuments("EBA RT.01–RT.04\nXLSX export")

    # ---- cross-band flows ----
    roi >> flow("assessed by a run") >> intake
    gate >> dep("interrupt: waiting on you", AMBER) >> hitl
    findings >> flow("drafts findings & risks") >> hitl
    hitl >> flow("on approval") >> [proj, risk, conc, export]
