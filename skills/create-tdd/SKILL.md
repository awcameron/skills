---
name: create-tdd
description: >-
   Generate a comprehensive Technical Design Document (TDD) based on a reference markdown
   template or document structure, supporting both greenfield design and retroactive
   documentation of existing codebases. Use this skill when a user asks to draft, write,
   or generate a technical design document, architecture spec, or engineering proposal
   referencing an existing template.
allowed-tools: [Read, Grep, Glob, Write, Bash(git status:*), Bash(git log:*)]
---

# Create Technical Design Document (create-tdd)

## Purpose
This skill guides the agent in analyzing the bundled reference template (`references/technical-design-doc.md`) and generating a thorough, production-ready Technical Design Document (TDD) tailored to either a new system design or a retroactively documented codebase.

## Workflow

1. **Locate and Read Reference**: Read `references/technical-design-doc.md` to extract the required heading hierarchy, metadata blocks, and architectural style guidelines. If the file is missing, default to standard engineering TDD headings.
2. **Determine Mode & Scope**:
   - **Greenfield Mode**: If the user is proposing a new feature or service, capture prospective design constraints, goals, and architectural plans.
   - **Reverse-Engineering Mode**: If the user points to an existing codebase or service directory, explore the repository structure, configuration files, and key modules to document the *actual implemented state* and any existing technical debt.
3. **Determine Sections**: Enforce core technical sections (Overview, System Architecture, Data Models, Security, Testing Strategy) while selectively omitting optional supplementary sections (e.g., Cost Analysis, Resilience) if the feature scope is lightweight.
4. **Gather & Clarify Requirements**:
   - Identify core features, component boundaries, and non-functional requirements.
   - **Ask-First Rule**: If critical architectural dependencies (e.g., database choices, upstream services) are ambiguous, prompt the user for clarification rather than making unverified assumptions.
5. **Draft the Document**: Populate each chosen section with precise, implementation-level details, ensuring a clean separation between problem statement, design, and deployment planning.
6. **Incorporate Visual Architecture (Mermaid Only)**:
   - **Exclusive Format**: Use **only** Mermaid for all visual diagrams. Do not use ASCII art, PlantUML, or binary images.
   - **Diagram Selection Matrix**: Select the optimal diagram type based on the architectural topic:
      - **System Architecture / Component Breakdown:** Use a `flowchart` (TD or LR) to map out infrastructure boundaries, service-to-service communication, and ingress/egress points.
      - **Data Flow / Request Lifecycles / API Interactions:** Use a `sequenceDiagram` to illustrate step-by-step actor interactions, synchronous/asynchronous messaging, and time-ordered request flows.
      - **State Transitions / Job Lifecycles (if applicable):** Use a `stateDiagram-v2` to depict object or job states.
      - **Data Models / Entity Relationships:** Use an `erDiagram` to depict database tables, fields, and their relationships.
   - Ensure all Mermaid syntax blocks are enclosed in valid ```mermaid code fences with clean, descriptive node identifiers and labels.
7. **Review and Validate**: Verify that all design choices align with existing system constraints, engineering standards, and the formatting rules of the reference template.
8. **Determine Output Path**: Check the repo for an existing design-doc convention (e.g. an existing `docs/tdd/`, `docs/design/`, or `docs/rfcs/` directory, or a documented convention in its own `AGENTS.md`/`CONTRIBUTING.md`/README) and save there. Default to `docs/tdd/[project-name-kebab-case]-tdd.md` only if the repo has no existing convention. Save to that path rather than just rendering the document in chat prose.