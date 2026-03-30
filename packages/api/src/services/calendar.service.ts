import { google } from 'googleapis';
import { prisma } from '../utils/prisma.js';
import { env } from '../utils/env.js';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getGoogleAuthUrl(employeeId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: employeeId,
    prompt: 'consent',
  });
}

export async function handleGoogleCallback(code: string, employeeId: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  await prisma.calendarConnection.upsert({
    where: { employeeId },
    create: {
      employeeId,
      provider: 'google',
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      syncEnabled: true,
    },
    update: {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || undefined,
      syncEnabled: true,
    },
  });
}

async function getAuthedCalendar(employeeId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { employeeId },
  });

  if (!connection || !connection.accessToken) {
    throw new Error('Geen Google Calendar koppeling gevonden');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.calendarConnection.update({
        where: { employeeId },
        data: { accessToken: tokens.access_token },
      });
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function syncBookingToGoogle(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { employee: true, service: true, customer: true, salon: true },
  });

  if (!booking) return;

  try {
    const calendar = await getAuthedCalendar(booking.employeeId);

    const startDateTime = `${booking.date}T${booking.startTime}:00`;
    const endDateTime = `${booking.date}T${booking.endTime}:00`;

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `${booking.service.name} - ${booking.customer.name}`,
        description: `Klant: ${booking.customer.name}\nTelefoon: ${booking.customer.phone || 'N/A'}\nNotities: ${booking.notes || 'Geen'}`,
        start: {
          dateTime: startDateTime,
          timeZone: booking.salon.timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: booking.salon.timezone,
        },
      },
    });

    await prisma.calendarConnection.update({
      where: { employeeId: booking.employeeId },
      data: { lastSynced: new Date() },
    });
  } catch (err) {
    console.error('[Calendar] Sync failed:', err);
  }
}

export async function disconnectGoogle(employeeId: string): Promise<void> {
  await prisma.calendarConnection.delete({
    where: { employeeId },
  });
}
