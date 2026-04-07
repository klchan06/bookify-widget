# Offerte - Boekgerust Widget

**Online Afsprakensysteem (Widget/Plugin)**

---

| | |
|---|---|
| **Offertedatum** | 30 maart 2026 |
| **Geldig tot** | 30 april 2026 |
| **Offertenummer** | BKF-2026-001 |
| **Opdrachtgever** | *[Naam opdrachtgever]* |
| **Uitvoerder** | *[Uw bedrijfsnaam]* |

---

## 1. Projectomschrijving

Ontwikkeling van een volledig online afsprakensysteem, vergelijkbaar met platforms als onlineafspraken.nl, geleverd als **embeddable widget en/of plugin** die eenvoudig geintegreerd kan worden op bestaande websites van dienstverleners zoals kapsalons, schoonheidssalons, klinieken en overige afspraakgerichte bedrijven.

Het systeem stelt eindklanten in staat om zelfstandig online afspraken in te plannen, terwijl de bedrijfseigenaar via een overzichtelijk beheerpaneel de volledige agenda, diensten en medewerkers kan beheren.

---

## 2. Scope & Deliverables

### 2.1 Embeddable Booking Widget
- Stapsgewijs boekingsproces (dienst > medewerker > datum/tijd > gegevens > bevestiging)
- Integreerbaar via eenvoudige `<script>` tag of iframe
- Volledig responsive design (mobiel, tablet, desktop)
- Aanpasbaar aan huisstijl (kleuren, lettertype, logo)
- Meertalig (Nederlands en Engels)

### 2.2 Admin Dashboard
- Beveiligd inlogscherm
- Overzichtelijke agenda (dag-, week- en maandweergave)
- Beheer van diensten (naam, beschrijving, duur, prijs)
- Beheer van medewerkers (naam, beschikbaarheid, werktijden)
- Klantenoverzicht met boekingshistorie
- Instellingen voor widget-styling en bedrijfsgegevens
- Embed code generator voor eenvoudige integratie

### 2.3 Backend & Infrastructuur
- RESTful API voor alle functionaliteit
- PostgreSQL database met volledige datamodellering
- JWT-gebaseerde authenticatie en autorisatie
- Geautomatiseerde e-mailnotificaties:
  - Boekingsbevestiging aan klant
  - Notificatie aan medewerker/salon
  - Herinneringsmail (optioneel)
  - Annuleringsbevestiging
- CI/CD pipeline (automatisch testen en deployen)
- Hosting-klaar voor Vercel/Railway of vergelijkbaar

### 2.4 Documentatie
- API-documentatie (OpenAPI/Swagger)
- Widget integratiehandleiding (voor webdevelopers)
- Gebruikershandleiding admin dashboard

---

## 3. Technische Specificaties

| Component | Technologie |
|-----------|-------------|
| Widget Frontend | React, TypeScript, Web Components |
| Admin Dashboard | React, TypeScript, Tailwind CSS |
| Backend API | Node.js, Express/Fastify, TypeScript |
| Database | PostgreSQL met Prisma ORM |
| Authenticatie | JWT + bcrypt |
| E-mail | Nodemailer / SendGrid |
| Build & Tooling | Turborepo (monorepo), Vite |
| CI/CD | GitHub Actions |
| Hosting | Vercel (frontends) + Railway (API + DB) |

---

## 4. Wat zit er NIET in deze offerte

De volgende functionaliteiten vallen buiten de huidige scope en kunnen als meerwerk worden aangeboden:

- Online betalingen (iDEAL, Stripe, Mollie)
- SMS-notificaties
- Google Calendar / Outlook synchronisatie
- Wachtlijst functionaliteit
- Review/beoordelingssysteem
- Meerdere vestigingen (multi-location)
- Geavanceerde rapportages en analytics
- Native mobiele app (iOS/Android)
- Custom domein en whitelabel branding
- Recurring/terugkerende afspraken

Deze kunnen na oplevering als uitbreidingsmodules worden geoffreerd.

---

## 5. Kostenopgave

| Onderdeel | Bedrag |
|-----------|--------|
| Booking widget (frontend) | € 300,00 |
| Admin dashboard | € 350,00 |
| Backend API & database | € 300,00 |
| E-mailnotificaties | € 50,00 |
| DevOps, CI/CD & hosting setup | € 100,00 |
| Documentatie & integratiehandleiding | € 50,00 |
| Projectmanagement & overleg | € 50,00 |
| | |
| **Totaal exclusief BTW** | **€ 1.200,00** |
| BTW (21%) | € 252,00 |
| **Totaal inclusief BTW** | **€ 1.452,00** |

---

## 6. Planning

| Fase | Omschrijving | Doorlooptijd |
|------|-------------|-------------|
| 1. Kickoff & Setup | Projectinrichting, database ontwerp, monorepo setup | Dag 1 |
| 2. Core Development | API, widget boekingsflow, dashboard basis | Dag 2-4 |
| 3. Integratie | Widget ↔ API koppeling, embed modes, e-mail | Dag 5-6 |
| 4. Afronding | Theming, responsive polish, testen | Dag 7-8 |
| 5. Oplevering | Documentatie, deploy, overdracht | Dag 9-10 |

**Geschatte doorlooptijd:** 10 werkdagen na akkoord

---

## 7. Betalingsvoorwaarden

| Moment | Percentage | Bedrag (excl. BTW) |
|--------|-----------|-------------------|
| Bij akkoord offerte | 50% | € 600,00 |
| Bij oplevering | 50% | € 600,00 |

---

## 8. Voorwaarden

- Offerte is geldig tot 30 april 2026
- Hosting- en domeinkosten zijn niet inbegrepen en worden apart doorberekend (geschat € 10-25/maand)
- Meerwerk buiten de beschreven scope wordt vooraf besproken en apart geoffreerd
- Broncode wordt na volledige betaling overgedragen
- Na oplevering is er 30 dagen garantie op bugfixes
- Support en onderhoud na garantieperiode kan via een apart onderhoudscontract

---

## 9. Akkoord

Door ondertekening gaat de opdrachtgever akkoord met de bovenstaande offerte en voorwaarden.

| | Opdrachtgever | Uitvoerder |
|---|---|---|
| **Naam** | | |
| **Datum** | | |
| **Handtekening** | | |

---

*Voor vragen over deze offerte kunt u contact opnemen via [e-mailadres] of [telefoonnummer].*
