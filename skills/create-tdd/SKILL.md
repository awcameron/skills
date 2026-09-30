---
name: create-tdd
description: >-
  Write a technical design document (TDD) -- a design doc, RFC, architecture spec, or engineering
  proposal -- from the user's or repo's own template, falling back to a bundled one. Covers
  greenfield designs and retroactively documenting an existing codebase. Use when the user asks to
  draft, write, or generate a design doc, RFC, or architecture spec. Not for test-driven development
  or writing tests (`write-tests`).
allowed-tools: [Read, Grep, Glob, Write, Edit, Bash(git status:*), Bash(git log:*)]
---

# Create Technical Design Document

Produces a technical design document -- for a new system, or retroactively for an existing
codebase -- following whichever template the user or repo already uses, and saves it where the
repo keeps design docs.

## Workflow

1. **Find the template.** In this order:
   1. A template or example doc the user names or attaches.
   2. The repo's own -- a template file (e.g. `docs/templates/*design*`, `*rfc*`, `*tdd*`) or,
      failing that, an existing design doc under `docs/tdd/`, `docs/design/`, `docs/rfcs/`, or
      wherever the repo's `AGENTS.md`/`CONTRIBUTING.md`/README says they live.
   3. The bundled [`references/technical-design-doc.md`](references/technical-design-doc.md).

   Say which one you're using. Take its heading hierarchy, metadata block, and style from it; a
   repo template's section list wins over the bundled one's.
2. **Pick the mode.**
   - **Greenfield**: a new feature or service -- capture goals, constraints, and the proposed
     design.
   - **Reverse-engineering**: the user points at an existing codebase or service directory --
     document the *actual implemented state*, including technical debt, from the repo itself.
     [`references/reverse-engineering-checklist.md`](references/reverse-engineering-checklist.md)
     maps concrete artifacts (manifests, IaC, CI config, schema files) to the sections they
     answer.
3. **Choose sections.** Keep the core ones the template has (typically Overview, System
   Architecture, Data Models, Security, Testing Strategy); drop optional ones (Cost Analysis,
   Resilience) when the scope is small.
   - **Security**: if this repo has `zero-trust-architecture`, structure the section around its
     layers (request-layer guard chain, service-to-service auth, tenant-isolation backstop,
     session-token handling); otherwise apply the same principles directly.
   - **Data Models / Deployment Plan**, when the design changes a schema, API, or event contract
     an existing consumer depends on: use `rollout-compatibility` (expand-contract migrations,
     additive changes, N/N-1 rolling-deploy tolerance) rather than an ad hoc migration plan. Not
     needed for a brand-new contract with no consumer.
4. **Clarify before assuming.** Identify core features, component boundaries, and non-functional
   requirements. If a critical dependency (database choice, an upstream service) is ambiguous, ask
   rather than inventing one.
5. **Draft** each section at implementation level, keeping problem statement, design, and
   deployment plan separate.
6. **Diagrams: Mermaid only** -- no ASCII art, PlantUML, or images. Pick the type by topic:
   - System architecture / components: `flowchart` (TD or LR) for boundaries, service-to-service
     calls, ingress/egress.
   - Request lifecycles / API interactions: `sequenceDiagram`.
   - State or job lifecycles: `stateDiagram-v2`.
   - Data models: `erDiagram`.

   Use ` ```mermaid ` fences with descriptive node ids and labels;
   [`references/mermaid-examples.md`](references/mermaid-examples.md) has a minimal valid snippet
   of each.
7. **Review** the draft against the template's structure and the repo's existing constraints and
   standards.
8. **Save it** where the repo keeps design docs (an existing `docs/tdd/`, `docs/design/`, or
   `docs/rfcs/` directory, or a documented convention). Only with no convention, default to
   `docs/tdd/<project-name-kebab-case>-tdd.md`. Write the file rather than only rendering the
   document in chat.
