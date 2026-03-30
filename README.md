# Bookify Widget

Een embeddable afspraken-kalender widget voor websites. Ideaal voor kapsalons, klinieken, studios en andere dienstverleners die online boekingen willen aanbieden.

## Features

- Instelbare diensten, tijdsloten en medewerkers
- Responsieve widget (iframe of Web Component)
- Admin dashboard voor agendabeheer
- E-mail/SMS bevestigingen
- Klantenbeheer
- Meerdere thema's en kleuren aanpasbaar aan huisstijl

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Frontend Widget | React + TypeScript, Web Components wrapper |
| Admin Dashboard | React + TypeScript + Tailwind CSS |
| Backend API | Node.js + Express (of Fastify) |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt |
| E-mail | Nodemailer / SendGrid |
| Hosting | Vercel (frontend) + Railway/Render (API) |

## Quickstart

```bash
npm install
npm run dev
```

## Widget Integratie

```html
<!-- Optie 1: Script tag -->
<script src="https://cdn.bookify.nl/widget.js" data-salon-id="abc123"></script>

<!-- Optie 2: iframe -->
<iframe src="https://app.bookify.nl/embed/abc123" width="100%" height="600"></iframe>
```

## Licentie

Proprietary - Alle rechten voorbehouden.
