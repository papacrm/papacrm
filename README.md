# i18n-shadcn-nukejs

A [NukeJS](https://nukejs.com) starter with **shadcn/ui** and **i18n** wired up out of the box — a hero landing page, a locale-aware routing setup (default locale unprefixed at `/`, other locales prefixed like `/fr`), and deploy-ready builds for Node, Vercel, and Cloudflare.

> **Your next project** — *NukeJS has got you*

## Features

- ⚡ [NukeJS](https://nukejs.com/docs) — full-stack React framework (SSR, HMR, file-based routing)
- 🎨 [Tailwind CSS v4](https://nukejs.com/docs/examples/tailwindcss) + [shadcn/ui](https://nukejs.com/docs/examples/shadcn) — `Button` component included, add more with `npx shadcn@latest add <component>`
- 🌍 [i18n](https://nukejs.com/docs/i18n) via `[locale]` routing — default locale (English) served unprefixed at `/`, other locales prefixed (`/fr`), with `/en` permanently redirecting to `/`
- 🧭 Locale-aware 404s — unknown routes return a real 404 instead of silently falling back to the default locale
- ☁️ One command builds for **Node**, **Vercel**, or **Cloudflare** — NukeJS auto-detects the target from CI environment variables
- 🔍 `robots.txt` and `llms.txt` included in `public/`

## Getting Started

Do not clone the repository. Instead, use the following command to create a new project based on this example:

```bash
npx degit unenterprise/i18n-shadcn-nukejs
```

Then install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Routing / locales

- **English (default)** lives unprefixed at `/`, `/about`, etc. — no `/en` in the URL.
- **French** lives under its prefix: `/fr`, `/fr/about`, etc.
- Requests to `/en` or `/en/...` get a permanent (301) redirect to the unprefixed
  equivalent (`/`, `/...`), so there's exactly one canonical URL per page.
- Unknown routes (e.g. `/does-not-exist`) return a real 404.

This is handled in `middleware.ts`, which runs before routing on every request —
in local dev, on Vercel, and inside the Cloudflare Worker build.

## Project structure

```
i18n-shadcn-nukejs/
├── app/
│   ├── pages/
│   │   ├── layout.tsx         # root layout — loads /styles.css + favicon
│   │   ├── index.tsx          # default locale (en) → "/"
│   │   └── [locale]/
│   │       └── index.tsx      # other locales → "/fr", etc.
│   ├── components/
│   │   ├── Hero.tsx           # shared hero UI, used by both pages above
│   │   ├── ui/button.tsx      # shadcn Button
│   │   └── LangSwitcher.tsx   # client-side language toggle
│   ├── lib/
│   │   ├── utils.ts           # shadcn cn() helper
│   │   └── useI18n.ts         # i18n hook (reads locale from the request)
│   ├── locales/
│   │   ├── en.json            # source of truth
│   │   └── fr.json
│   └── public/                 # static files served at /
│       ├── favicon.ico
│       ├── robots.txt
│       └── llms.txt
├── middleware.ts               # locale canonicalization + 404 guard (runtime-agnostic)
├── global.css                  # Tailwind + shadcn theme tokens
├── components.json             # shadcn CLI config
└── nuke.config.ts
```

## Adding shadcn components

```bash
npx shadcn@latest add input
npx shadcn@latest add dialog
```

Components land in `app/components/ui/`. Any component using React hooks needs
`"use client"` as its first line (NukeJS doesn't use RSC).

## Adding a locale

1. `cp app/locales/en.json app/locales/de.json` and translate every value.
2. Add `de` to the `translations` object in `app/lib/useI18n.ts`.
3. Add `de` to `LOCALES` and `PREFIXED_LOCALES` in `app/components/LangSwitcher.tsx`
   (skip `PREFIXED_LOCALES` only if `de` is becoming the new default).
4. Add `de` to `PREFIXED_LOCALES` in `middleware.ts` too, so it isn't caught by
   the unknown-route 404 guard.
5. TypeScript will fail the build if a locale file is missing a key (`fr.json`
   must match `en.json`'s shape exactly).

Only ever prefix non-default locales — the default locale must stay unprefixed
at `/` for the middleware redirect logic above to be correct.

## Deploying — Vercel, Cloudflare, or plain Node

NukeJS ships first-class build adapters for all three, and **auto-detects the
target** from CI environment variables, so `npm run build` just works when you
connect the repo to Vercel or Cloudflare Pages:

```bash
npm run build              # auto: Node locally, Vercel/Cloudflare in their CI
npm run build:vercel       # force a Vercel build (.vercel/output + vercel.json)
npm run build:cloudflare   # force a Cloudflare build (.cloudflare/output + wrangler.toml)
```

- **Vercel**: connect the repo, build command `npm run build`, output directory
  left as the framework default — NukeJS writes `.vercel/output` and
  `vercel.json` for you.
- **Cloudflare**: `wrangler pages deploy .cloudflare/output` (Pages) or
  `wrangler deploy` (standalone Workers, after `npm run build:cloudflare`).
  NukeJS generates `wrangler.toml` for you.
- **Plain Node** (Railway, Render, Fly.io, a container, a VPS, …):
  ```bash
  npm run build
  npm start   # node dist/index.mjs
  ```

`middleware.ts` runs inside a real Cloudflare Worker (V8 isolate, no Node
APIs) when built for Cloudflare, so its dev-only Tailwind watcher is gated to
never run outside local dev — verified by running all three build targets end
to end (`nuke build`, `nuke build --vercel`, `nuke build --cloudflare`) and
hitting `/`, `/en`, `/fr`, and an unknown route against each.

`vercel.json` and `wrangler.toml` are generated by the build and gitignored —
don't hand-edit them, they're regenerated every deploy.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs or feature requests.

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/unenterprise/orpc-ddd-i18n-nextjs/blob/main/LICENSE) file for details.