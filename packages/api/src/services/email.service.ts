import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../utils/env.js';
import { prisma } from '../utils/prisma.js';
import { generateManageToken } from '../utils/manageToken.js';

// Lazy init - process.env is read fresh each time we need to send
let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

// SMTP (eigen mailbox) - heeft voorrang boven Resend als geconfigureerd
let _smtp: Transporter | null = null;
function getSmtp(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (!_smtp) {
    const port = Number(process.env.SMTP_PORT) || 465;
    _smtp = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return _smtp;
}

interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  salonId: string;
  salonName: string;
  salonEmail: string;
  salonAddress?: string;
  salonCity?: string;
  salonPhone?: string;
  salonLogo?: string | null;
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

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Boekgerust</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          ${content}
        </table>
        <p style="margin:24px 0 0 0;font-size:12px;color:#86868b;text-align:center;">
          Powered by Boekgerust &middot; <a href="https://boekgerust.nl" style="color:#86868b;text-decoration:underline;">boekgerust.nl</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bookingCardHtml(data: BookingEmailData, headerColor: string, headerTitle: string, headerSubtitle: string): string {
  const headerLogo = data.salonLogo
    ? `<img src="${data.salonLogo}" alt="${data.salonName}" style="max-width:120px;max-height:80px;margin:0 auto 16px auto;display:block;border-radius:12px;background:#ffffff;padding:8px;" />`
    : `<div style="display:inline-block;width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;line-height:64px;font-size:32px;margin-bottom:16px;text-align:center;">&#10003;</div>`;

  return `
    <tr>
      <td style="background:linear-gradient(135deg,${headerColor},#1a1a2e);padding:40px 32px;text-align:center;">
        ${headerLogo}
        <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${headerTitle}</h1>
        <p style="margin:0;color:rgba(255,255,255,0.85);font-size:15px;">${headerSubtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 24px 0;font-size:16px;color:#1d1d1f;line-height:1.5;">
          Beste <strong>${data.customerName}</strong>,
        </p>
        <p style="margin:0 0 24px 0;font-size:15px;color:#515154;line-height:1.6;">
          Je afspraak bij <strong>${data.salonName}</strong>.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f7;border-radius:12px;padding:24px;margin-bottom:24px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;">
                    <p style="margin:0;font-size:12px;color:#86868b;text-transform:uppercase;letter-spacing:0.5px;">Dienst</p>
                    <p style="margin:4px 0 0 0;font-size:16px;color:#1d1d1f;font-weight:600;">${data.serviceName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;">
                    <p style="margin:0;font-size:12px;color:#86868b;text-transform:uppercase;letter-spacing:0.5px;">Datum &amp; Tijd</p>
                    <p style="margin:4px 0 0 0;font-size:16px;color:#1d1d1f;font-weight:600;">${formatDate(data.date)}</p>
                    <p style="margin:2px 0 0 0;font-size:15px;color:#515154;">${data.startTime} - ${data.endTime}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;">
                    <p style="margin:0;font-size:12px;color:#86868b;text-transform:uppercase;letter-spacing:0.5px;">Medewerker</p>
                    <p style="margin:4px 0 0 0;font-size:16px;color:#1d1d1f;font-weight:600;">${data.employeeName}</p>
                  </td>
                </tr>
                ${data.salonAddress ? `
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e5ea;">
                    <p style="margin:0;font-size:12px;color:#86868b;text-transform:uppercase;letter-spacing:0.5px;">Locatie</p>
                    <p style="margin:4px 0 0 0;font-size:16px;color:#1d1d1f;font-weight:600;">${data.salonName}</p>
                    <p style="margin:2px 0 0 0;font-size:15px;color:#515154;">${data.salonAddress}${data.salonCity ? ', ' + data.salonCity : ''}</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding:12px 0;">
                    <p style="margin:0;font-size:12px;color:#86868b;text-transform:uppercase;letter-spacing:0.5px;">Prijs</p>
                    <p style="margin:4px 0 0 0;font-size:18px;color:#1d1d1f;font-weight:700;">${formatPrice(data.price, data.currency)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function actionButtonsHtml(manageUrl: string): string {
  return `
    <tr>
      <td style="padding:0 32px 32px 32px;">
        <p style="margin:0 0 16px 0;font-size:14px;color:#86868b;text-align:center;">
          Niet meer kunnen komen of een andere tijd nodig?
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom:10px;">
              <a href="${manageUrl}" style="display:block;width:100%;box-sizing:border-box;padding:14px 0;background-color:#1a1a2e;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;text-align:center;">
                Afspraak wijzigen
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <a href="${manageUrl}#cancel" style="display:block;width:100%;box-sizing:border-box;padding:14px 0;background-color:#ffffff;color:#1a1a2e;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;text-align:center;border:1.5px solid #d2d2d7;">
                Annuleren
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function contactInfoHtml(data: BookingEmailData): string {
  if (!data.salonPhone && !data.salonEmail) return '';
  return `
    <tr>
      <td style="padding:24px 32px;background-color:#f5f5f7;border-top:1px solid #e5e5ea;">
        <p style="margin:0 0 8px 0;font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">
          Contact ${data.salonName}
        </p>
        <p style="margin:0;font-size:14px;color:#515154;text-align:center;">
          ${data.salonPhone ? `<a href="tel:${data.salonPhone}" style="color:#515154;text-decoration:none;">${data.salonPhone}</a>` : ''}
          ${data.salonPhone && data.salonEmail ? ' &middot; ' : ''}
          ${data.salonEmail ? `<a href="mailto:${data.salonEmail}" style="color:#515154;text-decoration:none;">${data.salonEmail}</a>` : ''}
        </p>
      </td>
    </tr>
  `;
}

function getManageUrl(bookingId: string): string {
  const token = generateManageToken(bookingId);
  // De manage-pagina draait op de widget-frontend, NIET op de API.
  // Negeer een verkeerd ingestelde WIDGET_URL die naar de API (onrender) wijst.
  const envUrl = env.WIDGET_URL || env.APP_URL || '';
  const baseUrl = envUrl && !envUrl.includes('onrender.com')
    ? envUrl
    : 'https://afspraken.boekgerust.nl';
  return `${baseUrl}/manage/${token}`;
}

// Genereer een .ics-kalenderbestand zodat de klant de afspraak kan toevoegen
function generateICS(data: BookingEmailData): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toStamp = (date: string, time: string) => {
    const [y, m, d] = date.split('-');
    const [h, min] = time.split(':');
    return `${y}${m}${d}T${h}${min}00`; // floating local time (NL)
  };
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const location = [data.salonAddress, data.salonCity].filter(Boolean).join(', ');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boekgerust//Afspraak//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${data.bookingId}@boekgerust.nl`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toStamp(data.date, data.startTime)}`,
    `DTEND:${toStamp(data.date, data.endTime)}`,
    `SUMMARY:${esc(data.serviceName)} - ${esc(data.salonName)}`,
    location ? `LOCATION:${esc(location)}` : '',
    `DESCRIPTION:${esc(`Afspraak voor ${data.serviceName} bij ${data.employeeName}.`)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function bookingDetailsHtml(data: BookingEmailData): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
      <tr><td style="padding:6px 0;color:#71717a;">Dienst</td><td style="padding:6px 0;text-align:right;font-weight:600;">${data.serviceName}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">Datum</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatDate(data.date)}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">Tijd</td><td style="padding:6px 0;text-align:right;font-weight:600;">${data.startTime} - ${data.endTime}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">Medewerker</td><td style="padding:6px 0;text-align:right;font-weight:600;">${data.employeeName}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a;">Prijs</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatPrice(data.price, data.currency)}</td></tr>
    </table>
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

async function sendEmail(to: string, subject: string, html: string, ics?: string): Promise<void> {
  // 1) Voorkeur: Resend (HTTPS-API, werkt betrouwbaar vanaf de server)
  const resend = getResend();
  if (resend) {
    try {
      const fromAddress = process.env.RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL;
      const result = await resend.emails.send({
        from: fromAddress, to, subject, html,
        ...(ics ? { attachments: [{ filename: 'afspraak.ics', content: Buffer.from(ics).toString('base64') }] } : {}),
      });
      if (!result.error) {
        console.log(`[Email] Sent via Resend to ${to}: ${subject} (id: ${result.data?.id})`);
        return;
      }
      console.error(`[Email] Resend rejected for ${to}: ${result.error.message || JSON.stringify(result.error)}`);
    } catch (err) {
      console.error('[Email] Resend failed, trying SMTP:', err);
    }
  }

  // 2) Terugval: SMTP via de eigen mailbox (werkt o.a. lokaal; op Render geblokkeerd)
  const smtp = getSmtp();
  if (smtp) {
    try {
      const from = process.env.SMTP_FROM || `Blessed Barbers <${process.env.SMTP_USER}>`;
      const info = await smtp.sendMail({
        from, to, subject, html,
        ...(ics ? { attachments: [{ filename: 'afspraak.ics', content: ics, contentType: 'text/calendar; method=PUBLISH' }] } : {}),
      });
      console.log(`[Email] Sent via SMTP to ${to}: ${subject} (id: ${info.messageId})`);
      return;
    } catch (err) {
      console.error('[Email] SMTP failed:', err);
    }
  }

  console.log(`[Email] Geen werkend transport - zou versturen naar ${to}: ${subject}`);
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  const manageUrl = getManageUrl(data.bookingId);
  const template = await getTemplate(data.salonId, 'booking_confirmation');
  let subject: string;
  if (template) {
    const vars = buildTemplateVars(data);
    subject = replaceVariables(template.subject, vars);
  } else {
    subject = `Bevestiging: ${data.serviceName} op ${formatDate(data.date)}`;
  }

  const html = baseTemplate(
    bookingCardHtml(data, '#10b981', 'Bevestigd!', 'Je afspraak is succesvol ingepland') +
      actionButtonsHtml(manageUrl) +
      contactInfoHtml(data),
  );

  // .ics-kalenderbijlage meesturen zodat de klant de afspraak kan opslaan
  const ics = generateICS(data);
  await sendEmail(data.customerEmail, subject, html, ics);
}

export async function sendBookingNotification(data: BookingEmailData): Promise<void> {
  const html = baseTemplate(
    `
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#1a1a2e);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Nieuwe afspraak</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:#1d1d1f;">Er is een nieuwe afspraak ingepland.</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#71717a;">Klant</p>
        <p style="margin:0 0 16px 0;font-size:16px;color:#1d1d1f;font-weight:600;">${data.customerName}</p>
        ${bookingDetailsHtml(data)}
      </td>
    </tr>
  `,
  );

  await sendEmail(data.salonEmail, `Nieuwe afspraak: ${data.customerName} - ${data.serviceName}`, html);
}

export async function sendBookingReminder(data: BookingEmailData): Promise<void> {
  const manageUrl = getManageUrl(data.bookingId);
  const template = await getTemplate(data.salonId, 'booking_reminder');
  let subject: string;
  if (template) {
    const vars = buildTemplateVars(data);
    subject = replaceVariables(template.subject, vars);
  } else {
    subject = `Herinnering: ${data.serviceName} op ${formatDate(data.date)}`;
  }

  const html = baseTemplate(
    bookingCardHtml(data, '#f59e0b', 'Herinnering', 'Je afspraak is bijna') +
      actionButtonsHtml(manageUrl) +
      contactInfoHtml(data),
  );

  await sendEmail(data.customerEmail, subject, html);
}

export async function sendBookingCancellation(data: BookingEmailData): Promise<void> {
  const template = await getTemplate(data.salonId, 'booking_cancellation');
  let subject: string;
  if (template) {
    const vars = buildTemplateVars(data);
    subject = replaceVariables(template.subject, vars);
  } else {
    subject = `Geannuleerd: ${data.serviceName} op ${formatDate(data.date)}`;
  }

  const html = baseTemplate(
    bookingCardHtml(data, '#6b7280', 'Geannuleerd', 'Je afspraak is geannuleerd') +
      contactInfoHtml(data),
  );

  await sendEmail(data.customerEmail, subject, html);
}

export async function sendBookingUpdate(data: BookingEmailData): Promise<void> {
  const template = await getTemplate(data.salonId, 'booking_update');
  let subject: string;
  if (template) {
    const vars = buildTemplateVars(data);
    subject = replaceVariables(template.subject, vars);
  } else {
    subject = `Gewijzigd: ${data.serviceName} op ${formatDate(data.date)}`;
  }

  const html = baseTemplate(
    bookingCardHtml(data, '#3b82f6', 'Gewijzigd', 'Je afspraak heeft een nieuwe datum/tijd') +
      contactInfoHtml(data),
  );

  await sendEmail(data.customerEmail, subject, html);
}
