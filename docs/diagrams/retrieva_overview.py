"""Retrieva — **Architecture Overview** (diagram-as-code) for the docs landing page.

A high-level, layered view (frontend → API → capability services → workers → datastores →
governed AI platform) — the icon-based replacement for the ASCII block in docs/intro.md. It is
deliberately higher-altitude than the C4 *container* view (retrieva_container.py); keep both in
sync with the code.

mingrammer `diagrams` + Graphviz. Self-contained (no cross-repo imports). Facts sourced from the
retrieva / retrieva-backend code (Express 5 · LiteLLM gateway · bge-m3 · Qdrant/PG/Redis · BullMQ).

Run:  python retrieva_overview.py   (needs: pip install diagrams ; brew/apt install graphviz)
Then: python embed-svg-images.py   (inline icons as base64 so the SVG renders standalone)
Out:  ../static/img/architecture/retrieva-overview.{png,svg}  (served by the Docusaurus site)
"""
from __future__ import annotations

from pathlib import Path

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.onprem.client import Users
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.network import Kong
from diagrams.programming.framework import NextJs
from diagrams.programming.language import NodeJS

# ----------------------------------------------------------------- theme (inlined)
SLATE, CYAN, GREEN, TEXT, MUTED, AMBER = "#0f172a", "#22d3ee", "#34d399", "#e2e8f0", "#94a3b8", "#f59e0b"
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
         "pad": "0.6", "nodesep": "0.45", "ranksep": "0.8", "splines": "spline"}
NODE = {"fontcolor": TEXT, "fontname": "Helvetica", "fontsize": "11"}
EDGE = {"color": MUTED, "fontcolor": MUTED, "fontname": "Helvetica", "fontsize": "9"}


def flow(label=""):
    return Edge(label=label, color=CYAN, fontcolor=MUTED)


def dep(label=""):
    return Edge(label=label, color=MUTED, fontcolor=MUTED, style="dashed")


with Diagram(
    "Retrieva — Architecture Overview  ·  DORA third-party-ICT compliance",
    filename=str(OUT / "retrieva-overview"),
    outformat=["png", "svg"],
    direction="TB",
    show=False,
    graph_attr=GRAPH,
    node_attr=NODE,
    edge_attr=EDGE,
):
    analyst = Users("Compliance & risk team\nbrowser (SSO)")

    with Cluster("Frontend  ·  Next.js 16 · React 19 · shadcn/ui", graph_attr=cl(GREEN)):
        frontend = node(NextJs, "retrieva-frontend\nAssessments · Questionnaires\nCopilot · Risk Register")

    with Cluster("API  ·  Express 5 · REST + Socket.io", graph_attr=cl(CYAN)):
        api = node(NodeJS, "retrieva-backend\nauth (JWT) · RBAC\nper-workspace tenant isolation", icon="express.png")

    with Cluster("Capability services  ·  LangChain / LangGraph", graph_attr=cl(CYAN)):
        rag = node(NodeJS, "RAG / Copilot\nrephrase → retrieve → rerank\n→ compress → generate → judge")
        assess = node(NodeJS, "Assessment\nDORA gap analysis\ncovered / partial / missing")
        quest = node(NodeJS, "Questionnaire\nLLM scoring")
        export = node(NodeJS, "Workspace / RoI export\nEBA RT.01–RT.04 XLSX")

    with Cluster("Background workers  ·  BullMQ", graph_attr=cl(AMBER)):
        w_ingest = node(NodeJS, "assessment worker\ningest · gap analysis", icon="bullmq.png")
        w_quest = node(NodeJS, "questionnaire worker\nLLM scoring", icon="bullmq.png")
        w_mon = node(NodeJS, "monitoring worker\n24h alerts (cert/contract/review)", icon="bullmq.png")

    with Cluster("Datastores", graph_attr=cl(AMBER)):
        qdrant = node(PostgreSQL, "Qdrant\nper-tenant vector\ncollections", icon="qdrant.png")
        pg = PostgreSQL("PostgreSQL\nDrizzle ORM")
        redis = Redis("Redis\nBullMQ queues · cache")

    with Cluster("Governed AI platform  ·  ai ns", graph_attr=cl(CYAN)):
        litellm = Kong("LiteLLM gateway\nprovider routing · key rotation\nfallbacks · PII masking")
        langfuse = node(Kong, "Langfuse\nLLM traces · cost", icon="langfuse.png")

    # ---- flows ----
    analyst >> flow("HTTPS") >> frontend
    frontend >> flow("REST + WS") >> api
    api >> flow() >> [rag, assess, quest, export]
    api >> flow("enqueue") >> [w_ingest, w_quest, w_mon]
    rag >> dep("vector search") >> qdrant
    assess >> dep() >> pg
    export >> dep() >> pg
    w_ingest >> dep("parse→chunk→embed") >> qdrant
    [w_ingest, w_quest, w_mon] >> dep() >> redis
    api >> dep() >> pg
    [rag, assess, quest] >> flow("chat / embeddings") >> litellm
    api >> dep("traces") >> langfuse
