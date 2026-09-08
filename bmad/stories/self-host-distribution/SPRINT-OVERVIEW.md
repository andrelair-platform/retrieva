# Retrieva — Self-hosting / distribution

**Product / board:** Retrieva — RNCP39583 Certification (Project #2)
**Initiative:** Certification
**Home repo:** `retrieva`
**Sequencing:** **Fast-follow / GTM — NOT v1.** Ships after the core engine (RTV-28→43) does
something worth hosting. Building distribution before the product has value is the classic trap.

## Why (justification)

Retrieva's customers are regulated EU financial entities whose ICT-TPRM data (contracts, vendor
evidence, the concentration map of their critical dependencies) is the most sensitive kind — many
security/procurement teams will refuse a multi-tenant SaaS. Self-host unlocks those accounts and is
**on-thesis**: a DORA ICT-third-party-risk tool is itself an ICT third-party arrangement, so letting
the customer self-host means using Retrieva does NOT add to the very concentration risk it measures
(their models, their data, their residency). The deployment artifacts nearly exist (signed ghcr
images + SBOM + Kustomize/GitOps).

**The decision that makes it smart vs a trap:** licensing. "Public images" with no license undercuts
monetization. Decide the open-core / license model WITH this epic, not after.

## Epics

| ID | Epic | Priority |
|---|---|---|
| RTV-44 | Self-hostable distribution (public signed images + Helm chart + BYO-deps + license + docs) | P2 (fast-follow) |
