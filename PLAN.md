# Boekgerust Widget - Ontwikkelplan

## Overzicht

Online afsprakensysteem als embeddable widget/plugin voor websites van dienstverleners (kapsalons, klinieken, studios). Vergelijkbaar met onlineafspraken.nl maar als lightweight, zelf-hostbare widget.

---

## Parallel Agent Teams

We verdelen het werk over **5 parallelle agent-teams** die gelijktijdig kunnen werken:

### Team 1: Backend API & Database
**Scope:** Volledige server-side logica

- [ ] Database schema ontwerp (Prisma)
  - Salons, medewerkers, diensten, tijdsloten, afspraken, klanten
- [ ] REST API endpoints
  - `POST /api/auth/register` & `/login`
  - `GET/POST/PUT/DELETE /api/services`
  - `GET/POST/PUT/DELETE /api/employees`
  - `GET /api/availability?date=&service=&employee=`
  - `POST /api/bookings`
  - `GET/PUT/DELETE /api/bookings/:id`
  - `GET /api/customers`
- [ ] Authenticatie & autorisatie (JWT)
- [ ] Validatie & error handling
- [ ] E-mail notificaties (bevestiging, herinnering, annulering)
- [ ] Seed data voor development

### Team 2: Widget Frontend
**Scope:** De embeddable booking widget die klanten zien

- [ ] React component library opzetten
- [ ] Stap 1: Dienst kiezen
- [ ] Stap 2: Medewerker kiezen (optioneel)
- [ ] Stap 3: Datum & tijd kiezen (kalender view)
- [ ] Stap 4: Gegevens invullen (naam, email, telefoon)
- [ ] Stap 5: Bevestiging
- [ ] Web Component wrapper (`<boekgerust-widget>`)
- [ ] iframe embed modus
- [ ] Theming systeem (kleuren, fonts via CSS variables)
- [ ] Responsive design (mobile-first)
- [ ] i18n (NL/EN)

### Team 3: Admin Dashboard
**Scope:** Beheerpaneel voor de salon/dienstverlener

- [ ] Login/registratie scherm
- [ ] Dashboard overzicht (afspraken vandaag, week)
- [ ] Agenda view (dag/week/maand)
- [ ] Diensten beheren (naam, duur, prijs)
- [ ] Medewerkers beheren (naam, werktijden)
- [ ] Beschikbaarheid & roosters instellen
- [ ] Klantenoverzicht
- [ ] Instellingen (bedrijfsnaam, widget styling, notificaties)
- [ ] Widget embed code generator

### Team 4: DevOps & Infrastructuur
**Scope:** CI/CD, hosting, monitoring

- [ ] Monorepo structuur opzetten (Turborepo of nx)
- [ ] Docker Compose voor lokale dev
- [ ] CI/CD pipeline (GitHub Actions)
  - Lint, test, build
  - Auto-deploy staging bij PR merge
  - Auto-deploy productie bij release tag
- [ ] Environment configuratie (.env templates)
- [ ] CDN setup voor widget bundle
- [ ] Database migrations strategie

### Team 5: Documentatie & Business
**Scope:** Offerte, docs, landing page

- [ ] Offerte document (OFFERTE.md)
- [ ] API documentatie (OpenAPI/Swagger)
- [ ] Widget integratie handleiding
- [ ] Admin gebruikershandleiding
- [ ] CLAUDE.md project context

---

## Projectstructuur

```
bookify-widget/
├── packages/
│   ├── api/                 # Backend API (Express + Prisma)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   ├── widget/              # Embeddable widget (React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   └── index.tsx
│   │   └── package.json
│   ├── dashboard/           # Admin dashboard (React)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   └── package.json
│   └── shared/              # Gedeelde types & utilities
│       ├── src/
│       │   └── types.ts
│       └── package.json
├── docs/
│   ├── api.md
│   ├── widget-integration.md
│   └── admin-guide.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── turbo.json
├── package.json
├── OFFERTE.md
├── PLAN.md
├── CLAUDE.md
└── README.md
```

---

## Fasering

| Fase | Beschrijving | Teams |
|------|-------------|-------|
| 1 - Setup (dag 1) | Monorepo, DB schema, basis routing, component scaffolding | Alle teams |
| 2 - Core (dag 2-4) | API endpoints, widget flow, dashboard CRUD | Team 1, 2, 3 |
| 3 - Integratie (dag 5-6) | Widget ↔ API koppeling, embed modes, e-mail | Team 1, 2, 4 |
| 4 - Polish (dag 7-8) | Theming, responsive, edge cases, testing | Team 2, 3, 4 |
| 5 - Docs & Deploy (dag 9-10) | Documentatie, CI/CD, staging deploy | Team 4, 5 |

---

## Definition of Done

- [ ] Widget kan worden ingebed via `<script>` tag of iframe
- [ ] Klant kan dienst kiezen, datum/tijd selecteren en afspraak boeken
- [ ] Salon-eigenaar kan via dashboard agenda beheren
- [ ] E-mail bevestiging wordt verstuurd bij nieuwe boeking
- [ ] Responsive op mobile en desktop
- [ ] Basis theming (kleuren aanpasbaar)
- [ ] API documentatie beschikbaar
- [ ] Deployed op staging omgeving
