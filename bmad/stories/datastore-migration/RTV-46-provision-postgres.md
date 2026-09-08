---
id: RTV-46-provision-postgres
title: "Provision PostgreSQL on-cluster (StatefulSet + Longhorn + ESO, dev/prod)"
status: Ready
type: Story
epic: datastore-migration
milestone: "RTV — Datastore migration (Postgres + Drizzle)"
estimate: 5
labels: [retrieva, cert, devops, gitops, database]
priority: P1
assignee: AndreLiar
repo: andrelair-platform/retrieva
project: 2
---

## Story

As a **Platform Engineer**, I want PostgreSQL running on-cluster with durable storage, managed credentials, and backups so that Retrieva has a production-grade relational datastore to migrate onto.

## Background

Parent epic **RTV-45** (#520); ADR `docs/architecture/datastore-postgresql.md`. Mirrors the existing platform DB pattern (the MongoDB StatefulSet it replaces + the Kine/Longhorn/ESO conventions).

## Acceptance Criteria

- [ ] AC-1: PostgreSQL `StatefulSet` (pinned version) with a **Longhorn** PVC; `retrieva` (dev) + prod overlays in `minicloud-gitops/services/retrieva/`.
- [ ] AC-2: Credentials via **Vault + ESO** (ExternalSecret → `DATABASE_URL`/user/password); no secrets in git; the ESO SSA `ignoreDifferences` applied per the gitops rule.
- [ ] AC-3: Backup/restore wired (logical `pg_dump` to MinIO on a schedule, matching the platform backup convention); a restore is verified once.
- [ ] AC-4: NetworkPolicy — only the retrieva backend may reach Postgres:5432; least-privilege.
- [ ] AC-5: ArgoCD app Synced/Healthy on dev; connectable from the backend pod.

## Technical Notes

- Reuse the RTV-04 MongoDB manifests as the shape template (StatefulSet + PVC + ESO), swapping image/port/probes.
- Do NOT remove the Mongo StatefulSet yet — both run transiently until cutover (RTV-49).

## Definition of Done
- [ ] ACs met; ArgoCD Synced/Healthy; backup+restore proven; parent RTV-45 (#520) updated

## Dependencies
- Parent: #520 (RTV-45)
- Blocks: RTV-47, RTV-48
