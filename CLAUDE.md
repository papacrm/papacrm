# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server (NukeJS + Tailwind watcher)
- `npm run build` — production build (Tailwind CLI + `nuke build`)
- `npm start` — run production build (`node dist/index.mjs`)

No test or lint scripts are configured.

## Architecture

**Stack**: NukeJS (file-based SSR React framework), React 19, TypeScript, MongoDB/Mongoose, oRPC, Tailwind CSS v4, shadcn/ui.

**Key directories**:
- `app/pages/` — file-based page routing. Dashboard under `/d` (auth-guarded).
- `app/router/` — client-side oRPC router definitions (lists, workflows, documents, sessions)
- `app/components/` — React components (shadcn/ui based)
- `server/rpc/[...rest].ts` — oRPC API endpoint
- `server/hooks/` — webhook server routes
- `lib/` — shared logic: Mongoose models, JWT auth, permissions, workflow engine
- `lib/models/` — Mongoose models: User, List, ListDocument, Workflow, WorkflowRecord

**API layer**: oRPC (type-safe RPC) served at `/rpc`. Server router in `router.ts` handles auth; client router files in `app/router/` handle domain operations. Client uses `withAuthRetry` wrapper for automatic token refresh.

**Auth**: OTP-based passwordless login. JWT access+refresh tokens in HTTP cookies. Middleware in `middleware.ts` guards `/d/*` routes and handles locale routing.

**Workflow engine**: `lib/workflowEngine.ts` — executes node/edge-based workflows with webhook triggers; can render SSR pages or return JSON.

**i18n**: Locale files in `app/locales/`. English is default (unprefixed), French is prefixed (`/fr`).

**Path alias**: `@/*` maps to project root (configured in tsconfig.json).
