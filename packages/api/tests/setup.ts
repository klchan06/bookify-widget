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
  // Clean database in correct order respecting foreign keys
  await prisma.booking.deleteMany();
  await prisma.employeeService.deleteMany();
  await prisma.employeeBreak.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.specialDay.deleteMany();
  await prisma.calendarConnection.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.salonSettings.deleteMany();
  await prisma.salon.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
