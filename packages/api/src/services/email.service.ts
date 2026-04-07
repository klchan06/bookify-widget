import { Resend } from 'resend';
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
  return `
    <tr>
      <td style="background:linear-gradient(135deg,${headerColor},#1a1a2e);padding:40px 32px;text-align:center;">
        <div style="display:inline-block;width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;line-height:64px;font-size:32px;margin-bottom:16px;">&#10003;</div>
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
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="${manageUrl}" style="display:inline-block;padding:14px 28px;background-color:#1a1a2e;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
                      Afspraak wijzigen
                    </a>
                  </td>
                  <td style="padding-left:8px;">
                    <a href="${manageUrl}#cancel" style="display:inline-block;padding:14px 28px;background-color:#ffffff;color:#1a1a2e;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;border:1.5px solid #d2d2d7;">
                      Annuleren
                    </a>
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
  const baseUrl = env.WIDGET_URL || env.APP_URL || 'http://localhost:3002';
  return `${baseUrl}/manage/${token}`;
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

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[Email] No RESEND_API_KEY set - would send to ${to}: ${subject}`);
    return;
  }

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL;
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });
    if (result.error) {
      console.error(`[Email] REJECTED by Resend for ${to}: ${result.error.message || JSON.stringify(result.error)}`);
      return;
    }
    console.log(`[Email] Sent to ${to}: ${subject} (id: ${result.data?.id})`);
  } catch (err) {
    console.error('[Email] Failed to send:', err);
  }
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

  await sendEmail(data.customerEmail, subject, html);
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
