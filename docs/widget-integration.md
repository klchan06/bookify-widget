# Bookify Widget - Integratie Handleiding

De Bookify widget kan op verschillende manieren worden ingebed op je website.

---

## Script Tag Methode (Aanbevolen)

De eenvoudigste manier om de widget toe te voegen:

```html
<!-- Stap 1: Voeg het script toe in de <head> of voor </body> -->
<script src="https://cdn.bookify.nl/widget.js" defer></script>

<!-- Stap 2: Plaats het Web Component waar je de widget wilt tonen -->
<bookify-widget
  salon-id="jouw-salon-id"
  api-url="https://api.bookify.nl"
></bookify-widget>
```

De widget rendert automatisch op de aangegeven plek.

---

## iframe Methode

Als je de widget liever in een iframe laadt (bijv. voor volledige isolatie):

```html
<iframe
  src="https://widget.bookify.nl/embed?salonId=jouw-salon-id"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; max-width: 500px;"
  title="Online afspraak maken"
></iframe>
```

---

## Web Component Attributen

| Attribuut | Type | Verplicht | Standaard | Beschrijving |
|-----------|------|-----------|-----------|-------------|
| `salon-id` | string | Ja | - | Uniek salon ID (te vinden in het dashboard) |
| `api-url` | string | Ja | - | URL van de Bookify API |
| `primary-color` | string | Nee | `#2563eb` | Hoofdkleur (hex) |
| `accent-color` | string | Nee | `#1d4ed8` | Accentkleur (hex) |
| `border-radius` | number | Nee | `8` | Hoekafronding in pixels |
| `font-family` | string | Nee | `system-ui` | Lettertype |
| `locale` | string | Nee | `nl` | Taal (`nl` of `en`) |
| `show-prices` | boolean | Nee | `true` | Toon prijzen |
| `show-duration` | boolean | Nee | `true` | Toon duur van diensten |

---

## Theming & Customization

### Via HTML attributen

```html
<bookify-widget
  salon-id="jouw-salon-id"
  api-url="https://api.bookify.nl"
  primary-color="#10b981"
  accent-color="#059669"
  border-radius="12"
  font-family="'Inter', sans-serif"
  locale="nl"
  show-prices="true"
  show-duration="true"
></bookify-widget>
```

### Via CSS Custom Properties

De widget gebruikt CSS variables die je kunt overschrijven:

```css
bookify-widget {
  --bookify-primary: #10b981;
  --bookify-accent: #059669;
  --bookify-bg: #ffffff;
  --bookify-text: #1f2937;
  --bookify-text-light: #6b7280;
  --bookify-border: #e5e7eb;
  --bookify-radius: 8px;
  --bookify-font: 'Inter', system-ui, sans-serif;
  --bookify-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### Via Dashboard

Kleurinstellingen en andere widget-opties kunnen ook worden aangepast in het dashboard onder **Instellingen > Widget Styling**.

---

## Platform-specifieke instructies

### WordPress

1. Ga naar het dashboard en kopieer je widget embed code
2. Open de WordPress pagina/post waar je de widget wilt plaatsen
3. Voeg een **Custom HTML** blok toe
4. Plak de embed code:

```html
<script src="https://cdn.bookify.nl/widget.js" defer></script>
<bookify-widget
  salon-id="jouw-salon-id"
  api-url="https://api.bookify.nl"
></bookify-widget>
```

5. Publiceer de pagina

**Alternatief:** Voeg het script toe aan je theme's `functions.php`:

```php
function bookify_widget_script() {
    wp_enqueue_script(
        'bookify-widget',
        'https://cdn.bookify.nl/widget.js',
        array(),
        null,
        true
    );
}
add_action('wp_enqueue_scripts', 'bookify_widget_script');
```

Gebruik vervolgens de shortcode of HTML blok met alleen het `<bookify-widget>` element.

### Plain HTML

Voeg toe aan je HTML bestand:

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Afspraak maken</title>
  <script src="https://cdn.bookify.nl/widget.js" defer></script>
</head>
<body>
  <h1>Maak een afspraak</h1>

  <bookify-widget
    salon-id="jouw-salon-id"
    api-url="https://api.bookify.nl"
    primary-color="#2563eb"
  ></bookify-widget>
</body>
</html>
```

### React

Installeer de widget of laad het script dynamisch:

```tsx
import { useEffect, useRef } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'bookify-widget': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'salon-id': string;
          'api-url': string;
          'primary-color'?: string;
          'accent-color'?: string;
          locale?: string;
        },
        HTMLElement
      >;
    }
  }
}

function BookingPage() {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.bookify.nl/widget.js';
    script.defer = true;
    document.head.appendChild(script);
    scriptLoaded.current = true;
  }, []);

  return (
    <div>
      <h1>Afspraak maken</h1>
      <bookify-widget
        salon-id="jouw-salon-id"
        api-url="https://api.bookify.nl"
        primary-color="#2563eb"
      />
    </div>
  );
}

export default BookingPage;
```

---

## Events

De widget emits custom events die je kunt beluisteren:

```javascript
const widget = document.querySelector('bookify-widget');

// Afspraak succesvol gemaakt
widget.addEventListener('bookify:booking-created', (event) => {
  console.log('Nieuwe afspraak:', event.detail);
  // { bookingId: 'uuid', date: '2026-04-01', time: '14:00', service: 'Knippen' }
});

// Widget stap gewijzigd
widget.addEventListener('bookify:step-changed', (event) => {
  console.log('Stap:', event.detail.step);
  // 'service' | 'employee' | 'datetime' | 'details' | 'confirmation'
});

// Fout opgetreden
widget.addEventListener('bookify:error', (event) => {
  console.error('Widget fout:', event.detail.message);
});
```

---

## Veelgestelde vragen

**Kan ik meerdere widgets op dezelfde pagina plaatsen?**
Ja, gebruik gewoon meerdere `<bookify-widget>` elementen met hetzelfde of verschillende salon IDs.

**Werkt de widget op mobiel?**
Ja, de widget is volledig responsive en werkt op alle schermformaten.

**Kan ik de widget verbergen/tonen met een knop?**
Ja, gebruik CSS of JavaScript om het element te tonen/verbergen:

```html
<button onclick="document.getElementById('booking').style.display='block'">
  Afspraak maken
</button>
<bookify-widget id="booking" style="display:none" ...></bookify-widget>
```
