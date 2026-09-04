---
name: create-tdd
description: Generate a comprehensive Technical Design Document (TDD) based on a reference markdown template or document structure, supporting both greenfield design and retroactive documentation of existing codebases. Use this skill when a user asks to draft, write, or generate a technical design document, architecture spec, or engineering proposal referencing an existing template.
---

# Create Technical Design Document (create-tdd)

## Purpose
This skill guides the agent in analyzing the bundled reference template (`references/technical-design-doc.md`) and generating a thorough, production-ready Technical Design Document (TDD) tailored to either a new system design or a retroactively documented codebase.

## Workflow

1. **Locate and Read Reference**: Read `references/technical-design-doc.md`[cite: 8] to extract the required heading hierarchy, metadata blocks, and architectural style guidelines.
2. **Determine Mode & Scope**:
    - **Greenfield Mode**: If the user is proposing a new feature or service, capture prospective design constraints, goals, and architectural plans.
    - **Reverse-Engineering Mode**: If the user points to an existing codebase or service directory, explore the repository structure, configuration files, and key modules to document the *actual implemented state* and any existing technical debt.
3. **Determine Sections**: Enforce core technical sections (Overview, System Architecture, Data Models, Security, Testing Strategy) while selectively omitting optional supplementary sections (e.g., Cost Analysis, Resilience) if the feature scope is lightweight.
4. **Gather & Clarify Requirements**:
    - Identify core features, component boundaries, and non-functional requirements.
    - **Ask-First Rule**: If critical architectural dependencies (e.g., database choices, upstream services) are ambiguous, prompt the user for clarification rather than making unverified assumptions.
5. **Draft the Document**: Populate each chosen section with precise, implementation-level details, ensuring a clean separation between problem statement, design, and deployment planning.
6. **Review and Validate**: Verify that all design choices align with existing system constraints, engineering standards, and the formatting rules of the reference template.
7. **Output Generation**: Save the final output to a structured path (e.g., `docs/tdd/[project-name]-tdd.md`) rather than just rendering it in chat prose.