import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually without dotenv dependency
try {
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
} catch {}


export const prisma = new PrismaClient();

beforeAll(async () => {
  // Only clean up test data (created by tests), not seed data
  // Tests create their own salon with email 'test@barbershop.nl'
  const testSalon = await prisma.salon.findFirst({ where: { email: 'test@barbershop.nl' } });
  if (testSalon) {
    await prisma.booking.deleteMany({ where: { salonId: testSalon.id } });
    await prisma.employeeService.deleteMany({ where: { employee: { salonId: testSalon.id } } });
    await prisma.employeeBreak.deleteMany({ where: { employee: { salonId: testSalon.id } } });
    await prisma.workingHours.deleteMany({ where: { employee: { salonId: testSalon.id } } });
    await prisma.specialDay.deleteMany({ where: { employee: { salonId: testSalon.id } } });
    await prisma.calendarConnection.deleteMany({ where: { employee: { salonId: testSalon.id } } });
    await prisma.customer.deleteMany({ where: { salonId: testSalon.id } });
    await prisma.service.deleteMany({ where: { salonId: testSalon.id } });
    await prisma.emailTemplate.deleteMany({ where: { salonId: testSalon.id } });
    await prisma.employee.deleteMany({ where: { salonId: testSalon.id } });
    await prisma.salonSettings.deleteMany({ where: { salonId: testSalon.id } });
    await prisma.salon.delete({ where: { id: testSalon.id } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
