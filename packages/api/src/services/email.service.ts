import { Resend } from 'resend';
import { env } from '../utils/env.js';
import { prisma } from '../utils/prisma.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  salonId: string;
  salonName: string;
  salonEmail: string;
  salonAddress?: string;
  salonCity?: string;
  salonPhone?: string;
  employeeName: string;
  serviceName: string;
  serviceDuration?: number;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  currency: string;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background: #6366f1; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { padding: 32px; }
    .detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .detail:last-child { border-bottom: none; }
    .label { color: #71717a; }
    .value { font-weight: 600; }
    .footer { padding: 16px 32px; background: #fafafa; font-size: 13px; color: #a1a1aa; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${title}</h1></div>
    <div class="body">${content}</div>
    <div class="footer">Dit is een automatisch bericht van Bookify.</div>
  </div>
</body>
</html>`;
}

function bookingDetailsHtml(data: BookingEmailData): string {
  return `
    <div class="detail"><span class="label">Dienst</span><span class="value">${data.serviceName}</span></div>
    <div class="detail"><span class="label">Datum</span><span class="value">${formatDate(data.date)}</span></div>
    <div class="detail"><span class="label">Tijd</span><span class="value">${data.startTime} - ${data.endTime}</span></div>
    <div class="detail"><span class="label">Medewerker</span><span class="value">${data.employeeName}</span></div>
    <div class="detail"><span class="label">Prijs</span><span class="value">${formatPrice(data.price, data.currency)}</span></div>
  `;
}

async function getTemplate(salonId: string, type: string): Promise<{ subject: string; body: string } | null> {
  const template = await prisma.emailTemplate.findFirst({
    where: { salonId, type, isActive: true },
  });
  return template;
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  return result;
}

function buildTemplateVars(data: BookingEmailData): Record<string, string> {
  return {
    '%KLANT.NAAM%': data.customerName,
    '%KLANT.EMAIL%': data.customerEmail,
    '%AFSPRAAK.DIENST%': data.serviceName,
    '%AFSPRAAK.DATUM%': formatDate(data.date),
    '%AFSPRAAK.TIJD%': data.startTime,
    '%AFSPRAAK.MEDEWERKER%': data.employeeName,
    '%AFSPRAAK.DUUR%': data.serviceDuration?.toString() || '',
    '%AFSPRAAK.PRIJS%': formatPrice(data.price, data.currency),
    '%SALON.NAAM%': data.salonName,
    '%SALON.ADRES%': data.salonAddress || '',
    '%SALON.STAD%': data.salonCity || '',
    '%SALON.TELEFOON%': data.salonPhone || '',
    '%SALON.EMAIL%': data.salonEmail,
  };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[Email] Failed to send:', err);
  }
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  const template = await getTemplate(data.salonId, 'booking_confirmation');
  if (template) {
    const vars = buildTemplateVars(data);
    const subject = replaceVariables(template.subject, vars);
    const body = replaceVariables(template.body, vars);
    const html = baseTemplate('Afspraak bevestiging', body);
    await sendEmail(data.customerEmail, subject, html);
    return;
  }

  const html = baseTemplate(
    'Afspraak bevestiging',
    `<p>Beste ${data.customerName},</p>
     <p>Je afspraak bij <strong>${data.salonName}</strong> is bevestigd!</p>
     ${bookingDetailsHtml(data)}
     <p style="margin-top:24px;color:#71717a;font-size:14px;">
       Wil je je afspraak wijzigen of annuleren? Neem contact op met ${data.salonName}.
     </p>`,
  );

  await sendEmail(data.customerEmail, `Bevestiging: ${data.serviceName} op ${formatDate(data.date)}`, html);
}

export async function sendBookingNotification(data: BookingEmailData): Promise<void> {
  const html = baseTemplate(
    'Nieuwe afspraak',
    `<p>Er is een nieuwe afspraak ingepland.</p>
     <div class="detail"><span class="label">Klant</span><span class="value">${data.customerName}</span></div>
     ${bookingDetailsHtml(data)}`,
  );

  await sendEmail(data.salonEmail, `Nieuwe afspraak: ${data.customerName} - ${data.serviceName}`, html);
}

export async function sendBookingReminder(data: BookingEmailData): Promise<void> {
  const template = await getTemplate(data.salonId, 'booking_reminder');
  if (template) {
    const vars = buildTemplateVars(data);
    const subject = replaceVariables(template.subject, vars);
    const body = replaceVariables(template.body, vars);
    const html = baseTemplate('Herinnering afspraak', body);
    await sendEmail(data.customerEmail, subject, html);
    return;
  }

  const html = baseTemplate(
    'Herinnering afspraak',
    `<p>Beste ${data.customerName},</p>
     <p>Dit is een herinnering voor je afspraak bij <strong>${data.salonName}</strong> morgen.</p>
     ${bookingDetailsHtml(data)}
     <p style="margin-top:24px;color:#71717a;font-size:14px;">
       Kun je niet komen? Neem zo snel mogelijk contact op met ${data.salonName}.
     </p>`,
  );

  await sendEmail(data.customerEmail, `Herinnering: ${data.serviceName} op ${formatDate(data.date)}`, html);
}

export async function sendBookingCancellation(data: BookingEmailData): Promise<void> {
  const template = await getTemplate(data.salonId, 'booking_cancellation');
  if (template) {
    const vars = buildTemplateVars(data);
    const subject = replaceVariables(template.subject, vars);
    const body = replaceVariables(template.body, vars);
    const html = baseTemplate('Afspraak geannuleerd', body);
    await sendEmail(data.customerEmail, subject, html);
    return;
  }

  const html = baseTemplate(
    'Afspraak geannuleerd',
    `<p>Beste ${data.customerName},</p>
     <p>Je afspraak bij <strong>${data.salonName}</strong> is geannuleerd.</p>
     ${bookingDetailsHtml(data)}
     <p style="margin-top:24px;">Wil je een nieuwe afspraak maken? Bezoek onze website.</p>`,
  );

  await sendEmail(data.customerEmail, `Geannuleerd: ${data.serviceName} op ${formatDate(data.date)}`, html);
}

export async function sendBookingUpdate(data: BookingEmailData): Promise<void> {
  const template = await getTemplate(data.salonId, 'booking_update');
  if (template) {
    const vars = buildTemplateVars(data);
    const subject = replaceVariables(template.subject, vars);
    const body = replaceVariables(template.body, vars);
    const html = baseTemplate('Afspraak gewijzigd', body);
    await sendEmail(data.customerEmail, subject, html);
    return;
  }

  const html = baseTemplate(
    'Afspraak gewijzigd',
    `<p>Beste ${data.customerName},</p>
     <p>Je afspraak bij <strong>${data.salonName}</strong> is gewijzigd. Hieronder de nieuwe gegevens:</p>
     ${bookingDetailsHtml(data)}`,
  );

  await sendEmail(data.customerEmail, `Gewijzigd: ${data.serviceName} op ${formatDate(data.date)}`, html);
}
