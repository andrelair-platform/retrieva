"""Retrieva — C4 **Container** view (diagram-as-code).

mingrammer `diagrams` + Graphviz. Self-contained (no cross-repo imports) so it lives with
the Retrieva docs. Facts sourced from docs/docs/architecture/solution-architecture.md and the
retrieva / retrieva-backend code.

Run:  python retrieva_container.py   (needs: pip install diagrams ; brew/apt install graphviz)
Out:  ../static/img/architecture/retrieva-container.{png,svg}  (served by the Docusaurus site)
"""
from __future__ import annotations

from pathlib import Path

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.onprem.client import Users
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.identity import Dex
from diagrams.onprem.network import Kong, Nginx
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
         "pad": "0.6", "nodesep": "0.5", "ranksep": "0.85", "splines": "spline"}
NODE = {"fontcolor": TEXT, "fontname": "Helvetica", "fontsize": "11"}
EDGE = {"color": MUTED, "fontcolor": MUTED, "fontname": "Helvetica", "fontsize": "9"}


def flow(label=""):
    return Edge(label=label, color=CYAN, fontcolor=MUTED)


def dep(label=""):
    return Edge(label=label, color=MUTED, fontcolor=MUTED, style="dashed")


with Diagram(
    "Retrieva — C4 Container view  ·  DORA third-party-ICT compliance",
    filename=str(OUT / "retrieva-container"),
    outformat=["png", "svg"],
    direction="LR",
    show=False,
    graph_attr=GRAPH,
    node_attr=NODE,
    edge_attr=EDGE,
):
    analyst = Users("Compliance analyst\nbrowser")

    with Cluster("Edge", graph_attr=cl(CYAN)):
        ingress = Nginx("Ingress-nginx\nTLS · path routing")
        sso = node(Dex, "Authentik SSO\nOIDC (planned)", icon="authentik.png")

    with Cluster("Retrieva  ·  retrieva / retrieva-dev ns", graph_attr=cl(GREEN)):
        frontend = node(NextJs, "retrieva-frontend\nNext.js 16 · React 19\n:3000")
        backend = node(NodeJS, "retrieva-backend\nExpress 5 · Node 20 · :3007\nREST + socket.io")
        workers = node(NodeJS, "workers\nBullMQ consumers\ningest · assessments", icon="bullmq.png")
        with Cluster("Datastores", graph_attr=cl(AMBER)):
            pg = PostgreSQL("PostgreSQL 17\nDrizzle ORM\nusers · assessments · audit")
            qdrant = node(PostgreSQL, "Qdrant 1.13\nper-tenant vector\ncollections", icon="qdrant.png")
            redis = Redis("Redis 7\nBullMQ queues · cache")

    with Cluster("minicloud AI platform  ·  ai ns (governed)", graph_attr=cl(CYAN)):
        litellm = Kong("LiteLLM gateway\nkeys · routing · PII mask")
        langfuse = node(Kong, "Langfuse\nLLM traces · cost · evals", icon="langfuse.png")

    ollama = node(PostgreSQL, "Ollama (local dev only)\nllama3.2 · bge-m3", icon="ollama.png")

    # ---- flows ----
    analyst >> flow("HTTPS") >> ingress
    ingress >> flow("forward-auth") >> sso
    ingress >> flow("/ → UI") >> frontend
    frontend >> flow("REST + WS") >> backend
    backend >> dep("app data") >> pg
    backend >> dep("vector search k=15") >> qdrant
    backend >> dep("jobs") >> redis
    backend >> flow("enqueue") >> workers
    workers >> dep("parse→chunk→embed") >> qdrant
    workers >> dep() >> redis
    backend >> flow("chat/completions") >> litellm
    workers >> flow("embeddings") >> litellm
    backend >> dep("traces (session·user)") >> langfuse
    litellm >> dep("dev fallback") >> ollama
