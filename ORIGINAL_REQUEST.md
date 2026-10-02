# ORIGINAL_REQUEST.md

> Handoff Protocol artifact. Read this first.

## Ask

> Plan the architecture; say what is needed; maintain memory, logs, a PRD, a
> user flow document, and explanations; build the basic scaffold; and push to
> GitHub. Plan and initialize the entire repo properly, using the skills in the
> Obsidian vault.
>
> Product brief: **Kinetex LiveOps — Change-Aware Event Command Center.** Turn
> event records in Notion into a dependency-aware command center: when a plan
> changes, show the operational impact, propose role-owned follow-ups, and
> record approved decisions back into Notion. The hybrid works as one
> change-to-closure workflow: plan → detect dependencies → preview impact →
> assign follow-ups → approve and sync → brief each role → capture lessons.

## Metadata

- **Date:** 2026-10-02
- **Working directory:** `C:\Users\KIIT\Downloads\Kinetex`
- **Repo:** `github.com/Prithanjan/kinetex-liveops` (public)
- **Integrity mode:** tracer bullet, verified at each layer
- **Owner:** Prithanjan Acharyya

## Requirements

- **R1** Plan the architecture and record it.
- **R2** State what is needed to build it.
- **R3** Maintain memory (decision log + vault write-back).
- **R4** Maintain logs (build log).
- **R5** PRD document.
- **R6** User flow document.
- **R7** Explanations (mechanism-first).
- **R8** Build the basic scaffold.
- **R9** Push to GitHub.
- **R10** Use the vault skills.

## Decisions locked with the owner

- Next.js 15 + TypeScript + Tailwind + bun (R8).
- Local seed + Notion adapter, offline-safe (R2, R8).
- Public `Prithanjan/kinetex-liveops` (R9).
- Working tracer bullet, not a skeleton (R8).

## Definition of done (MVP)

- One venue-change path runs end to end: seed → traversal → conflicts →
  follow-ups → approval → write-back.
- API routes for graph, preview, apply, reset.
- Three screens: dashboard, change console, role views.
- Engine unit tests pass; typecheck and production build pass.
- Docs R3–R7 exist and match the code.
- Repo pushed to GitHub.
- Non-claims recorded in `README.md` and `docs/demo-script.md`.
