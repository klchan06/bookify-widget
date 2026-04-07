# Boekgerust Widget

## Project
Online afsprakensysteem als embeddable widget/plugin voor dienstverleners (kapsalons etc.). Vergelijkbaar met onlineafspraken.nl. Domein: boekgerust.nl.

## Architecture
- Monorepo met Turborepo
- `packages/api` - Node.js + Express + Prisma + PostgreSQL
- `packages/widget` - React widget, gebouwd als Web Component
- `packages/dashboard` - React admin dashboard met Tailwind
- `packages/shared` - Gedeelde TypeScript types

## Commands
- `npm run dev` - Start alle packages in dev mode
- `npm run build` - Build alles
- `npm run lint` - Lint alles
- `npm run test` - Run tests

## Conventions
- TypeScript everywhere
- Prisma voor database queries (geen raw SQL)
- JWT auth via middleware
- REST API (geen GraphQL)
- Nederlandse UI teksten, Engelse code/variabelen
- Tailwind voor styling in dashboard, CSS variables voor widget theming

## Key Files
- `PLAN.md` - Ontwikkelplan met team-indeling
- `OFFERTE.md` - Klantofferte (€1200 excl. BTW)
