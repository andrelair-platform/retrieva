"""Retrieva — **How the AI-native service works** (diagram-as-code).

The one-page "why two repos" view: raw client data on the left → the autonomous agents that turn it
into DORA artefacts (the five AI-native pillars) → a human-in-the-loop inbox of DRAFTS → the DORA
analyst who signs off → the outcomes. It makes the two-repo split legible:

  * retrieva-backend  — the deterministic **TypeScript supervisor** that owns the rails: discovery,
    the DDQ/contradiction loop, the contract redliner, the exit-strategy agents, CTPP surveillance,
    register completeness, and the unified DORA score. Every agent drafts into an HITL inbox; nothing
    is auto-applied.
  * retrieva-assessment-crew — the **CrewAI (Python)** multi-agent assessment crew, reached over the
    **A2A** protocol (JSON-RPC `message/send`, `assess-arrangement` skill). The supervisor delegates
    the deep gap analysis to it when `CREW_A2A_ENABLED=true`, then maps the result back into the graph.

Both talk to the **governed AI platform** (LiteLLM gateway + Langfuse traces) — no model is called
directly. The trust boundary is the inbox: agents propose, the analyst disposes.

mingrammer `diagrams` + Graphviz. Self-contained (no cross-repo imports). Facts sourced from the
retrieva-backend / retrieva-assessment-crew code.

Run:  python retrieva_ai_native.py   (needs: pip install diagrams ; brew/apt install graphviz)
Then: python embed-svg-images.py     (inline icons as base64 so the SVG renders standalone)
Out:  ../static/img/architecture/retrieva-ai-native.{png,svg}  (served by the Docusaurus site)
"""
from __future__ import annotations

from pathlib import Path

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Client, Users
from diagrams.onprem.compute import Server
from diagrams.onprem.network import Kong
from diagrams.programming.language import NodeJS, Python

# ----------------------------------------------------------------- theme (inlined, matches the suite)
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
         "pad": "0.6", "nodesep": "0.4", "ranksep": "1.0", "splines": "spline"}
NODE = {"fontcolor": TEXT, "fontname": "Helvetica", "fontsize": "11"}
EDGE = {"color": MUTED, "fontcolor": MUTED, "fontname": "Helvetica", "fontsize": "9"}


def flow(label="", color=CYAN):
    return Edge(label=label, color=color, fontcolor=MUTED)


def dep(label="", color=MUTED):
    return Edge(label=label, color=color, fontcolor=MUTED, style="dashed")


with Diagram(
    "Retrieva — how the AI-native service works  ·  agents propose, the analyst disposes",
    filename=str(OUT / "retrieva-ai-native"),
    outformat=["png", "svg"],
    direction="LR",
    show=False,
    graph_attr=GRAPH,
    node_attr=NODE,
    edge_attr=EDGE,
):
    # ---- 1. raw client data (the inputs the agents turn into DORA artefacts) ----
    with Cluster("Client data  ·  as-is, no clean inputs required", graph_attr=cl(GREEN)):
        evidence = node(Storage, "Vendor evidence\nSOC 2 · ISO · pen-tests\ncontracts (PDF)")
        discovery_src = node(Storage, "Discovery sources\nEntra ID · SaaS registries\nCSV/XLSX · REST/SCIM/OData")
        feeds = node(Storage, "Live feeds\nStatusPage incidents\nCVE / OSV.dev")

    # ---- 2. the autonomous agents = the five AI-native pillars (retrieva-backend supervisor) ----
    with Cluster("retrieva-backend  ·  deterministic TypeScript supervisor (the rails)", graph_attr=cl(CYAN)):
        with Cluster("1 · Autonomous RoI engine", graph_attr=cl(MUTED)):
            a_disc = node(NodeJS, "Discovery + completeness\nRTV-91/93/106/107", icon="express.png")
        with Cluster("2 · Vendor DD & DDQs", graph_attr=cl(MUTED)):
            a_ddq = node(NodeJS, "Dynamic DDQ · contradiction\n· follow-ups  RTV-103/104/105", icon="express.png")
        with Cluster("3 · Contract lifecycle", graph_attr=cl(MUTED)):
            a_contract = node(NodeJS, "Art-30 redliner + notice/\nprice alerts  RTV-97/98", icon="express.png")
        with Cluster("4 · Exit strategy", graph_attr=cl(MUTED)):
            a_exit = node(NodeJS, "Substitutes · blueprint ·\nreintegration  RTV-99–102", icon="express.png")
        with Cluster("5 · CTPP surveillance", graph_attr=cl(MUTED)):
            a_surv = node(NodeJS, "Incidents · CVE · blast-\nradius  RTV-94/95/96", icon="express.png")
        score = node(NodeJS, "Unified DORA score engine\n0.6·gap + 0.4·ddq − risk penalty\n→ GREEN / AMBER / RED", icon="express.png")

    # ---- 3. the CrewAI assessment crew (retrieva-assessment-crew) over A2A ----
    with Cluster("retrieva-assessment-crew  ·  CrewAI (Python) — delegated deep gap analysis", graph_attr=cl(VIOLET)):
        crew = node(Python, "assess-arrangement skill\nJSON-RPC message/send\nbyte-identical vendored schema")

    # ---- governed AI platform (nothing calls a model directly) ----
    with Cluster("Governed AI platform  ·  ai ns", graph_attr=cl(AMBER)):
        litellm = Kong("LiteLLM gateway\nrouting · fallbacks · PII masking")
        langfuse = node(Kong, "Langfuse\ntraces · cost (session-stitched)", icon="langfuse.png")

    # ---- 4. the trust boundary: human-in-the-loop inbox of DRAFTS ----
    with Cluster("Human-in-the-loop inbox  ·  DRAFTS — never auto-applied", graph_attr=cl(GREEN)):
        inbox = node(Server, "Proposals · findings · amendments\nexit artefacts · surveillance events\n· contradiction flags")

    # ---- 5. the analyst who signs off ----
    analyst = Users("DORA analyst / risk owner\napprove · reject · acknowledge")

    # ---- 6. the outcomes ----
    with Cluster("Outcomes  ·  the compliance deliverables", graph_attr=cl(CYAN)):
        out_roi = node(Client, "Register of Information\nEBA RT.01–RT.04 XLSX")
        out_score = node(Client, "Live per-vendor\nDORA risk score")
        out_arte = node(Client, "Signed amendments ·\nexit blueprints · risk register")

    agents = [a_disc, a_ddq, a_contract, a_exit, a_surv]

    # ---- flows ----
    evidence >> flow() >> a_ddq
    evidence >> flow() >> a_contract
    discovery_src >> flow() >> a_disc
    feeds >> flow() >> a_surv

    # the supervisor delegates deep gap analysis to the crew over A2A, then maps it back
    a_ddq >> flow("A2A  message/send", VIOLET) >> crew
    crew >> dep("gaps → graph", VIOLET) >> a_ddq

    # every agent + the crew reason through the governed gateway
    (agents + [crew]) >> dep("chat / embeddings", AMBER) >> litellm
    litellm >> dep("traces", AMBER) >> langfuse

    # the score engine is recomputed from gap + ddq + risk signals
    [a_disc, a_ddq, a_surv] >> dep("signals") >> score

    # agents propose → inbox; analyst disposes → outcomes
    (agents + [score]) >> flow("draft") >> inbox
    inbox >> flow("review") >> analyst
    analyst >> flow("approve") >> [out_roi, out_score, out_arte]
