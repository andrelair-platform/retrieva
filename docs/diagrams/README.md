# Retrieva architecture diagrams (diagram-as-code)

C4 views of Retrieva written as Python with [mingrammer `diagrams`](https://diagrams.mingrammer.com/)
(Graphviz), kept **with the docs** so they never drift. Part of the platform-wide diagram-as-code
standard (see `minicloud-platform-docs/diagrams/`).

## Generate

```bash
brew install graphviz          # or: apt-get install -y graphviz   (system dep)
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python retrieva_container.py   # → ../static/img/architecture/retrieva-container.{png,svg}
```

The image lands in the Docusaurus `static/` tree, so the site serves it at
`/img/architecture/retrieva-container.svg`. It's embedded in
`docs/architecture/solution-architecture.md`.

## Files

- `retrieva_overview.py` — high-level **Architecture Overview** (layered: frontend → API → capability services → workers → datastores → governed AI platform). Embedded on the docs landing page (`docs/intro.md`).
- `retrieva_assessment_flow.py` — **How an assessment flows** (process view: build register → LangGraph supervisor run → human-in-the-loop decision → projections/export). Uses the built-in flowchart shapes. Embedded on the landing page.
- `retrieva_container.py` — C4 **container** view (frontend, backend, workers, datastores, governed AI platform).
- `embed-svg-images.py` — post-process step that inlines icon PNGs as base64 so the SVGs render standalone. **Run it after regenerating any diagram.**
- `icons/` — brand PNGs for components with no built-in `diagrams` icon (Qdrant, Langfuse, Authentik, Ollama, BullMQ).

To add a brand icon: drop a transparent PNG in `icons/` and pass `icon="name.png"` to `node()`.
Commit the regenerated image alongside the source change.
