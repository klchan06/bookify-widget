# Bookify API Documentatie

Base URL: `http://localhost:3000/api`

Alle responses volgen het standaard formaat:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optioneel bericht"
}
```

Bij fouten:

```json
{
  "success": false,
  "error": "Foutmelding"
}
```

## Authenticatie

Beveiligde endpoints vereisen een JWT token in de `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Auth

### POST /api/auth/register

Registreer een nieuw salon account.

- **Auth:** Geen
- **Request body:**

```json
{
  "salonName": "Kapsalon Voorbeeld",
  "ownerName": "Jan Jansen",
  "email": "jan@voorbeeld.nl",
  "password": "wachtwoord123",
  "phone": "0612345678"
}
```

- **Response (201):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "salonId": "uuid",
      "employeeId": "uuid",
      "email": "jan@voorbeeld.nl",
      "role": "owner"
    }
  }
}
```

### POST /api/auth/login

Inloggen met email en wachtwoord.

- **Auth:** Geen
- **Request body:**

```json
{
  "email": "jan@voorbeeld.nl",
  "password": "wachtwoord123"
}
```

- **Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "salonId": "uuid",
      "employeeId": "uuid",
      "email": "jan@voorbeeld.nl",
      "role": "owner"
    }
  }
}
```

---

## Services (Diensten)

### GET /api/services

Lijst van alle diensten voor het salon.

- **Auth:** Vereist
- **Query params:** geen
- **Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "salonId": "uuid",
      "name": "Knippen heren",
      "description": "Standaard herenkapper",
      "duration": 30,
      "price": 2500,
      "currency": "EUR",
      "category": "Knippen",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/services

Maak een nieuwe dienst aan.

- **Auth:** Vereist (owner/admin)
- **Request body:**

```json
{
  "name": "Knippen heren",
  "description": "Standaard herenkapper",
  "duration": 30,
  "price": 2500,
  "category": "Knippen"
}
```

- **Response (201):** Service object

### PUT /api/services/:id

Werk een dienst bij.

- **Auth:** Vereist (owner/admin)
- **Request body:** Velden om bij te werken (name, description, duration, price, category, isActive, sortOrder)
- **Response (200):** Bijgewerkte service object

### DELETE /api/services/:id

Verwijder een dienst (soft delete via isActive=false).

- **Auth:** Vereist (owner/admin)
- **Response (200):**

```json
{
  "success": true,
  "message": "Dienst verwijderd"
}
```

---

## Employees (Medewerkers)

### GET /api/employees

Lijst van alle medewerkers.

- **Auth:** Vereist
- **Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "salonId": "uuid",
      "name": "Lisa de Vries",
      "email": "lisa@voorbeeld.nl",
      "phone": "0687654321",
      "avatarUrl": null,
      "role": "employee",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "services": ["uuid1", "uuid2"],
      "workingHours": [...]
    }
  ]
}
```

### POST /api/employees

Voeg een nieuwe medewerker toe.

- **Auth:** Vereist (owner/admin)
- **Request body:**

```json
{
  "name": "Lisa de Vries",
  "email": "lisa@voorbeeld.nl",
  "phone": "0687654321",
  "role": "employee",
  "serviceIds": ["uuid1", "uuid2"],
  "workingHours": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "isWorking": true },
    { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00", "isWorking": true }
  ]
}
```

- **Response (201):** Employee object

### PUT /api/employees/:id

Werk een medewerker bij.

- **Auth:** Vereist (owner/admin)
- **Request body:** Velden om bij te werken
- **Response (200):** Bijgewerkte employee object

### DELETE /api/employees/:id

Deactiveer een medewerker.

- **Auth:** Vereist (owner)
- **Response (200):**

```json
{
  "success": true,
  "message": "Medewerker gedeactiveerd"
}
```

---

## Availability (Beschikbaarheid)

### GET /api/availability

Haal beschikbare tijdsloten op.

- **Auth:** Geen (publiek endpoint voor widget)
- **Query params:**
  - `salonId` (vereist) - UUID van het salon
  - `date` (vereist) - Datum in YYYY-MM-DD formaat
  - `serviceId` (vereist) - UUID van de dienst
  - `employeeId` (optioneel) - UUID van een specifieke medewerker
- **Response (200):**

```json
{
  "success": true,
  "data": {
    "date": "2026-04-01",
    "slots": [
      { "time": "09:00", "available": true, "employeeId": "uuid" },
      { "time": "09:30", "available": true, "employeeId": "uuid" },
      { "time": "10:00", "available": false },
      { "time": "10:30", "available": true, "employeeId": "uuid" }
    ]
  }
}
```

---

## Bookings (Afspraken)

### POST /api/bookings

Maak een nieuwe afspraak (vanuit widget).

- **Auth:** Geen (publiek endpoint voor widget)
- **Request body:**

```json
{
  "salonId": "uuid",
  "serviceId": "uuid",
  "employeeId": "uuid",
  "date": "2026-04-01",
  "startTime": "14:00",
  "customerName": "Piet Bakker",
  "customerEmail": "piet@example.nl",
  "customerPhone": "0612345678",
  "notes": "Optionele notitie"
}
```

- **Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "date": "2026-04-01",
    "startTime": "14:00",
    "endTime": "14:30",
    "service": { "name": "Knippen heren", "duration": 30, "price": 2500 },
    "employee": { "name": "Lisa de Vries" }
  },
  "message": "Afspraak bevestigd. Een bevestiging is verstuurd naar piet@example.nl."
}
```

### GET /api/bookings

Lijst van afspraken (voor dashboard).

- **Auth:** Vereist
- **Query params:**
  - `date` (optioneel) - Filter op datum (YYYY-MM-DD)
  - `startDate` / `endDate` (optioneel) - Datumbereik
  - `employeeId` (optioneel) - Filter op medewerker
  - `status` (optioneel) - Filter op status (pending, confirmed, cancelled, completed, no_show)
  - `page` (optioneel, default: 1)
  - `pageSize` (optioneel, default: 20)
- **Response (200):** Paginated lijst van booking objecten

### GET /api/bookings/:id

Haal een specifieke afspraak op.

- **Auth:** Vereist
- **Response (200):** Booking object met service, employee en customer data

### PUT /api/bookings/:id

Werk een afspraak bij (herplannen, status wijzigen).

- **Auth:** Vereist
- **Request body:**

```json
{
  "date": "2026-04-02",
  "startTime": "15:00",
  "status": "confirmed"
}
```

- **Response (200):** Bijgewerkte booking object

### DELETE /api/bookings/:id

Annuleer een afspraak.

- **Auth:** Vereist
- **Request body:**

```json
{
  "cancelReason": "Klant heeft afgezegd"
}
```

- **Response (200):**

```json
{
  "success": true,
  "message": "Afspraak geannuleerd"
}
```

---

## Customers (Klanten)

### GET /api/customers

Lijst van alle klanten.

- **Auth:** Vereist
- **Query params:**
  - `search` (optioneel) - Zoek op naam of email
  - `page` (optioneel, default: 1)
  - `pageSize` (optioneel, default: 20)
- **Response (200):** Paginated lijst van customer objecten

### GET /api/customers/:id

Klantdetails inclusief boekingsgeschiedenis.

- **Auth:** Vereist
- **Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Piet Bakker",
    "email": "piet@example.nl",
    "phone": "0612345678",
    "totalBookings": 5,
    "lastVisit": "2026-03-15",
    "bookings": [...]
  }
}
```

---

## Calendar (Agenda)

### GET /api/calendar

Agenda weergave voor dashboard.

- **Auth:** Vereist
- **Query params:**
  - `startDate` (vereist) - YYYY-MM-DD
  - `endDate` (vereist) - YYYY-MM-DD
  - `employeeId` (optioneel)
- **Response (200):** Lijst van bookings gegroepeerd per dag

### POST /api/calendar/google/connect

Start Google Calendar OAuth flow.

- **Auth:** Vereist
- **Response (200):**

```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

### GET /api/calendar/google/callback

Google OAuth callback (verwerkt door de server).

- **Auth:** Via OAuth state parameter
- **Response:** Redirect naar dashboard

### DELETE /api/calendar/google/disconnect

Verbreek Google Calendar verbinding.

- **Auth:** Vereist
- **Response (200):**

```json
{
  "success": true,
  "message": "Google Calendar verbinding verbroken"
}
```

---

## Salon (Instellingen)

### GET /api/salon

Haal salon informatie en instellingen op.

- **Auth:** Vereist
- **Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Kapsalon Voorbeeld",
    "slug": "kapsalon-voorbeeld",
    "email": "info@voorbeeld.nl",
    "phone": "0201234567",
    "address": "Keizersgracht 123",
    "city": "Amsterdam",
    "postalCode": "1015 AA",
    "settings": {
      "bookingLeadTime": 2,
      "bookingWindow": 30,
      "slotDuration": 15,
      "widgetPrimaryColor": "#2563eb",
      "widgetAccentColor": "#1d4ed8"
    }
  }
}
```

### PUT /api/salon

Werk salon informatie bij.

- **Auth:** Vereist (owner/admin)
- **Request body:** Velden om bij te werken
- **Response (200):** Bijgewerkte salon object

### PUT /api/salon/settings

Werk salon instellingen bij.

- **Auth:** Vereist (owner/admin)
- **Request body:**

```json
{
  "bookingLeadTime": 4,
  "bookingWindow": 60,
  "widgetPrimaryColor": "#10b981"
}
```

- **Response (200):** Bijgewerkte settings object

### GET /api/salon/:slug/public

Publieke salon informatie (voor widget).

- **Auth:** Geen
- **Response (200):** Salon naam, diensten, medewerkers, en widget configuratie

---

## Health

### GET /api/health

Health check endpoint.

- **Auth:** Geen
- **Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-03-30T12:00:00Z"
}
```

---

## Foutcodes

| Status | Betekenis |
|--------|-----------|
| 400 | Bad Request - Ongeldige invoer |
| 401 | Unauthorized - Niet ingelogd of ongeldig token |
| 403 | Forbidden - Geen rechten voor deze actie |
| 404 | Not Found - Resource niet gevonden |
| 409 | Conflict - Tijdslot al bezet |
| 422 | Unprocessable Entity - Validatiefout |
| 500 | Internal Server Error |
