/**
 * Embed script for Boekgerust Widget
 *
 * Usage:
 * <script src="https://cdn.boekgerust.nl/widget.js" data-salon-id="abc123"></script>
 *
 * Optional data attributes:
 * - data-api-url (defaults to https://api.boekgerust.nl)
 * - data-primary-color
 * - data-accent-color
 * - data-locale (nl | en)
 * - data-font-family
 */

import './web-component';

(function () {
  // Find the script tag
  const currentScript =
    document.currentScript ||
    document.querySelector('script[data-salon-id]');

  if (!currentScript) {
    console.warn('[Boekgerust] Could not find script tag with data-salon-id');
    return;
  }

  const salonId = currentScript.getAttribute('data-salon-id');
  if (!salonId) {
    console.warn('[Boekgerust] Missing data-salon-id attribute');
    return;
  }

  const apiUrl =
    currentScript.getAttribute('data-api-url') || 'https://api.boekgerust.nl';

  // Create the widget element
  const widget = document.createElement('boekgerust-widget');
  widget.setAttribute('salon-id', salonId);
  widget.setAttribute('api-url', apiUrl);

  // Pass optional attributes
  const optionalAttrs = [
    ['data-primary-color', 'primary-color'],
    ['data-accent-color', 'accent-color'],
    ['data-locale', 'locale'],
    ['data-font-family', 'font-family'],
    ['data-border-radius', 'border-radius'],
  ];

  for (const [dataAttr, widgetAttr] of optionalAttrs) {
    const value = currentScript.getAttribute(dataAttr);
    if (value) {
      widget.setAttribute(widgetAttr, value);
    }
  }

  // Insert after the script tag
  currentScript.parentNode?.insertBefore(widget, currentScript.nextSibling);
})();
