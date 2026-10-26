---
sidebar_position: 5
---

# Product release and promotion

Retrieva is one product delivered by three independently built components:

| Component | Source repository | Runtime | Production artifact |
|---|---|---|---|
| Backend | `retrieva-backend` | Node.js/Express | `retrieva-backend:<sha>` |
| Frontend | `retrieva-frontend` | Next.js | `retrieva-frontend:<sha>` |
| Assessment crew | `retrieva-assessment-crew` | Python/CrewAI A2A server | `retrieva-assessment-crew:<sha>` |

Separate repositories do not create separate product releases. A production release is the exact
three-artifact set recorded in `minicloud-gitops/services/retrieva/release.json`.

## Promotion flow

```text
backend CI  → backend-dev verification ─┐
frontend CI → frontend-dev verification ├→ product-dev integration → product-prod PR → Argo CD
crew CI     → crew-dev verification ────┘
```

The component dev stages remain separate because each image has its own build, dependencies and
failure modes. `product-dev` is the consolidation point: it binds one verified Freight from every
component into a single candidate release and runs the live cross-component analysis.

`product-prod` accepts Freight only from a verified `product-dev` combination. Its promotion updates
all three production tags and the release manifest in one CODEOWNERS-gated pull request. Independent
backend-only, frontend-only or crew-only production stages do not exist.

## Gates

### Component verification

- `backend-dev`: backend health and governed LLM path.
- `frontend-dev`: deployed frontend HTTP health.
- `crew-dev`: crew health and the `assess-arrangement` A2A Agent Card skill.

These answer: **does each promoted artifact work in dev?**

### Product integration verification

The `retrieva-product-dev-verify` AnalysisTemplate runs inside the Kargo project namespace against
the live dev services. It asserts:

1. backend `/health` returns HTTP 200;
2. frontend `/` returns HTTP 200;
3. crew `/healthz` returns HTTP 200;
4. the crew Agent Card advertises `assess-arrangement`;
5. an A2A JSON-RPC `message/send` returns the expected contract version and safe
   `insufficient_evidence` verdict.

The A2A test deliberately supplies zero clauses. It exercises DNS, NetworkPolicy, Service routing,
the A2A transport and the shared response contract without invoking an LLM or creating persistent
domain state.

This gate answers: **does this exact component combination work together?** A failed analysis leaves
the Freight unverified and therefore ineligible for `product-prod`.

### Release completeness

The required GitOps merge check `scripts/check_retrieva_release.py` rejects a production change when:

- backend, frontend or assessment crew is absent from the release manifest;
- a manifest tag differs from its production Helm value;
- a tag is not an immutable hexadecimal commit SHA;
- `product-dev` omits a component or the A2A integration analysis;
- `product-prod` does not source all components from `product-dev`;
- an independent component production stage is reintroduced.

This is the machine-enforced protection against the assessment crew—or another product component—
being forgotten during a future promotion.

## Ownership and source of truth

| Concern | Source of truth |
|---|---|
| Application code and tests | Each component's source repository |
| Desired deployment state | `minicloud-gitops/services/retrieva*/helm/` |
| Kargo Warehouses, Stages and analyses | `minicloud-gitops/services/retrieva/kargo/` |
| Exact production component set | `minicloud-gitops/services/retrieva/release.json` |
| Live reconciliation | Argo CD applications `retrieva-prod`, `retrieva-assessment-crew-prod`, `kargo-retrieva` |

Repository configuration proves desired state. Argo CD/Kargo status and running pod images prove live
state. Do not hand-edit image tags or manually synchronize a GitOps-managed workload.

## Rollback

Rollback is a Git change, not a live cluster edit:

1. revert the product promotion PR, including all three tags and `release.json`;
2. merge through the normal CODEOWNERS gate;
3. let Argo CD reconcile the previous immutable artifact set;
4. verify all applications are `Synced / Healthy` and rerun the product integration smoke.

If only one component is defective, select its previous verified Freight while retaining the known-good
versions of the other two, then promote the resulting complete product combination.

## Current proven baseline

On 2026-10-25, the production assessment crew was promoted to `89b174a` and verified from the running
backend through a real A2A `message/send`. The product-level Kargo and release-completeness gates were
then introduced to make that manual completeness check permanent.
