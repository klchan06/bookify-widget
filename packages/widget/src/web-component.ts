import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BookifyWidget } from './components/BookifyWidget';
import type { WidgetConfig } from '@bookify/shared';
import widgetStyles from './styles/widget.css?inline';

class BookifyWidgetElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return [
      'salon-id',
      'api-url',
      'primary-color',
      'accent-color',
      'locale',
      'font-family',
      'border-radius',
    ];
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });

    // Inject styles into shadow DOM
    const style = document.createElement('style');
    style.textContent = widgetStyles;
    shadow.appendChild(style);

    // Create mount point
    const container = document.createElement('div');
    shadow.appendChild(container);

    this.root = createRoot(container);
    this.render();
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  attributeChangedCallback() {
    this.render();
  }

  private getConfig(): WidgetConfig {
    return {
      salonId: this.getAttribute('salon-id') || '',
      apiUrl: this.getAttribute('api-url') || '',
      primaryColor: this.getAttribute('primary-color') || undefined,
      accentColor: this.getAttribute('accent-color') || undefined,
      borderRadius: this.getAttribute('border-radius')
        ? Number(this.getAttribute('border-radius'))
        : undefined,
      fontFamily: this.getAttribute('font-family') || undefined,
      locale: (this.getAttribute('locale') as 'nl' | 'en') || 'nl',
      showPrices: this.getAttribute('show-prices') !== 'false',
      showDuration: this.getAttribute('show-duration') !== 'false',
    };
  }

  private render() {
    if (!this.root) return;

    const config = this.getConfig();
    if (!config.salonId || !config.apiUrl) {
      console.warn(
        '[Boekgerust Widget] Missing required attributes: salon-id, api-url'
      );
      return;
    }

    this.root.render(
      React.createElement(BookifyWidget, { config })
    );
  }
}

// Register custom element
if (!customElements.get('boekgerust-widget')) {
  customElements.define('boekgerust-widget', BookifyWidgetElement);
}

export { BookifyWidgetElement };
