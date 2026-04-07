// Main entry: routes between widget preview and manage page
import './styles/host.css';

async function bootstrap() {
  const apiUrl = import.meta.env.VITE_API_URL || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : 'https://boekgerust-api.onrender.com'
  );

  const path = window.location.pathname;
  const manageMatch = path.match(/\/manage\/([^/]+)/);

  const manageRoot = document.getElementById('manage-root') as HTMLElement;
  const widgetRoot = document.getElementById('widget-root') as HTMLElement;

  if (manageMatch) {
    widgetRoot.style.display = 'none';
    const { mountManagePage } = await import('./manage-entry');
    mountManagePage(manageRoot, manageMatch[1]);
  } else {
    manageRoot.style.display = 'none';
    await import('./web-component');
    const widget = document.getElementById('bk-widget');
    if (widget) widget.setAttribute('api-url', apiUrl);
  }
}

bootstrap();
