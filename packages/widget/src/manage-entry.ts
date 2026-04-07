import React from 'react';
import { createRoot } from 'react-dom/client';
import { ManageBooking } from './components/ManageBooking';
import './styles/variables.css';
import './styles/widget.css';
import './styles/calendar.css';
import './styles/forms.css';

export function mountManagePage(container: HTMLElement, token: string) {
  const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
  const root = createRoot(container);
  root.render(React.createElement(ManageBooking, { token, apiUrl }));
}
