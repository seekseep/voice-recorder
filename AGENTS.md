# AGENTS.md

## Purpose

This file defines the implementation workflow for this repository.

## Roles

### Claude

- Implements the assigned task
- Must read `AGENTS.md` and `PLAN.md` before starting work
- Must follow the current file structure, contracts, and lane ownership
- Must avoid unrelated refactors unless explicitly instructed

### Copilot

- Reviews Claude's implementation
- Fixes problems found during review
- When a new rule is needed, appends it to this file before the next Claude task

## Stack Rules

1. Frontend uses React
2. Phase 1 stays single-page
3. Rust owns file persistence and SQLite writes
4. Frontend sends recording bytes through `save_recording`
5. React components do not use `try/catch`; they branch on `AppResult`
6. AppResult helper functions are named `succeed` and `fail`

## Workflow Rules

1. Claude implements
2. Copilot reviews and fixes
3. Copilot appends new durable rules here when needed
4. Claude reads the updated file before the next implementation

## Coordination Rules

1. If either side is waiting, check status every 30 seconds
2. Use the task board text file for human-readable progress
3. Keep contracts stable once Lane 0 is fixed unless both sides agree to change them
4. Do not start any React-dependent lane before the React setup lane is complete

## Phase 1 Guardrails

1. Do not introduce routing yet
2. Do not add MP3 conversion to the critical path
3. Do not swallow errors
4. Prefer small, lane-scoped changes over broad rewrites
5. Keep browser APIs in `src/infrastructure/services/`
6. Keep Tauri command calls in `src/infrastructure/repositories/`
7. Keep component-facing orchestration in `src/application/usecases/`
8. Put shared result types in `src/shared/result/`
