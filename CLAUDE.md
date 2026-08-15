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
- `app/router/` — oRPC router definitions (auth/otp, session, lists, modules, list documents)
- `app/components/` — React components (shadcn/ui based)
- `server/rpc/[...rest].ts` — oRPC API endpoint
- `server/hooks/` — webhook server routes
- `app/lib-server/` — shared server-only logic: Mongoose models, JWT auth, permissions, module engine, node executors
- `app/lib-server/models/` — Mongoose models: User, List, ListDocument, Module, ModuleRecord
- `app/lib-server/nodes/` — server-side node executors (one file per module node type, registered in `index.ts`)
- `app/lib/node-defs/` — editor-side node definitions (labels/fields/icons per node type), re-exported via `app/lib/moduleTypes.ts`

**API layer**: oRPC (type-safe RPC) served at `/rpc`. Server router in `app/router/index.ts` handles auth and domain operations (`app/lib-server/orpc/auth.ts` provides the `pub`/`authed` procedures). Client uses `withAuthRetry` wrapper for automatic token refresh.

**Auth**: OTP-based passwordless login. JWT access+refresh tokens in HTTP cookies. Middleware in `middleware.ts` guards `/d/*` routes and handles locale routing.

**Module engine**: `app/lib-server/moduleEngine.ts` — executes node/edge-based modules with webhook triggers; can render SSR pages or return JSON. To add a new node type: create `app/lib-server/nodes/<name>.ts` (a `NodeExecutor`) and `app/lib/node-defs/<name>.ts` (the editor-side `ModuleNodeDef`), then register both in their folder's `index.ts`.

**i18n**: Locale files in `app/locales/`. English is default (unprefixed), French is prefixed (`/fr`).

**Path alias**: `@/*` maps to project root (configured in tsconfig.json).
