import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
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

  // Create salon
  const salon = await prisma.salon.create({
    data: {
      name: 'Blessed Barbers',
      slug: 'blessed-barbers',
      email: 'info@blessedbarbers.nl',
      phone: '036-1234567',
      address: 'Stadsplein 100',
      city: 'Almere',
      postalCode: '1315 HR',
      description: 'De beste barbershop van Almere. Stijlvol knippen, baard trimmen en meer.',
      timezone: 'Europe/Amsterdam',
      currency: 'EUR',
    },
  });

  // Create settings
  await prisma.salonSettings.create({
    data: {
      salonId: salon.id,
      bookingLeadTime: 2,
      bookingWindow: 30,
      cancellationWindow: 24,
      slotDuration: 45,
      allowEmployeeChoice: true,
      requirePhone: true,
      confirmationEmailEnabled: true,
      reminderEmailEnabled: true,
      reminderHoursBefore: 24,
      widgetPrimaryColor: '#1a1a2e',
      widgetAccentColor: '#e94560',
      widgetBorderRadius: 8,
      widgetFontFamily: 'Inter, sans-serif',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create employees
  const khalid = await prisma.employee.create({
    data: {
      salonId: salon.id,
      name: 'Khalid B.',
      email: 'khalid@blessedbarbers.nl',
      phone: '06-12345678',
      role: 'owner',
      passwordHash,
      isActive: true,
    },
  });

  const youssef = await prisma.employee.create({
    data: {
      salonId: salon.id,
      name: 'Youssef M.',
      email: 'youssef@blessedbarbers.nl',
      phone: '06-23456789',
      role: 'employee',
      passwordHash,
      isActive: true,
    },
  });

  const omar = await prisma.employee.create({
    data: {
      salonId: salon.id,
      name: 'Omar A.',
      email: 'omar@blessedbarbers.nl',
      phone: '06-34567890',
      role: 'employee',
      passwordHash,
      isActive: true,
    },
  });

  // Create working hours (Tue-Sat, closed Sun-Mon)
  // dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  for (const employee of [khalid, youssef, omar]) {
    const hours = [
      { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isWorking: false }, // Sunday off
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: false }, // Monday off
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorking: true },  // Tuesday
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorking: true },  // Wednesday
      { dayOfWeek: 4, startTime: '09:00', endTime: '20:00', isWorking: true },  // Thursday (late)
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorking: true },  // Friday
      { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isWorking: true },  // Saturday
    ];

    await prisma.workingHours.createMany({
      data: hours.map((h) => ({ ...h, employeeId: employee.id })),
    });

    // Add lunch break
    const lunchBreaks = [2, 3, 4, 5, 6].map((day) => ({
      employeeId: employee.id,
      dayOfWeek: day,
      startTime: '12:30',
      endTime: '13:00',
    }));

    await prisma.employeeBreak.createMany({ data: lunchBreaks });
  }

  // Create services
  const knippenBaard = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Knippen + baard',
      description: 'Compleet verzorgd: haar knippen en baard trimmen',
      duration: 45,
      price: 2500,
      currency: 'EUR',
      category: 'Combinatie',
      sortOrder: 1,
    },
  });

  const knippen = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Knippen',
      description: 'Haar knippen naar wens',
      duration: 45,
      price: 2000,
      currency: 'EUR',
      category: 'Haar',
      sortOrder: 2,
    },
  });

  const baard = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Baard',
      description: 'Baard trimmen en shapen',
      duration: 45,
      price: 1000,
      currency: 'EUR',
      category: 'Baard',
      sortOrder: 3,
    },
  });

  const lineup = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Line up',
      description: 'Scherpe lijnen en contouren',
      duration: 45,
      price: 1000,
      currency: 'EUR',
      category: 'Haar',
      sortOrder: 4,
    },
  });

  const kinderen = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Kinderen tot 10 jaar',
      description: 'Knippen voor kinderen tot 10 jaar',
      duration: 45,
      price: 1500,
      currency: 'EUR',
      category: 'Kinderen',
      sortOrder: 5,
    },
  });

  // Link all employees to all services
  const allServices = [knippenBaard, knippen, baard, lineup, kinderen];
  for (const employee of [khalid, youssef, omar]) {
    await prisma.employeeService.createMany({
      data: allServices.map((s) => ({
        employeeId: employee.id,
        serviceId: s.id,
      })),
    });
  }

  // Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      salonId: salon.id,
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      phone: '06-11111111',
      totalBookings: 3,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      salonId: salon.id,
      name: 'Max de Vries',
      email: 'max@example.com',
      phone: '06-22222222',
      totalBookings: 1,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      salonId: salon.id,
      name: 'Jayden Bakker',
      email: 'jayden@example.com',
      phone: '06-33333333',
      totalBookings: 2,
    },
  });

  // Create sample bookings (upcoming)
  await prisma.booking.create({
    data: {
      salonId: salon.id,
      employeeId: khalid.id,
      serviceId: knippenBaard.id,
      customerId: customer1.id,
      date: '2026-04-01',
      startTime: '10:00',
      endTime: '10:45',
      status: 'confirmed',
    },
  });

  await prisma.booking.create({
    data: {
      salonId: salon.id,
      employeeId: youssef.id,
      serviceId: knippen.id,
      customerId: customer2.id,
      date: '2026-04-01',
      startTime: '11:00',
      endTime: '11:45',
      status: 'confirmed',
    },
  });

  await prisma.booking.create({
    data: {
      salonId: salon.id,
      employeeId: omar.id,
      serviceId: baard.id,
      customerId: customer3.id,
      date: '2026-04-02',
      startTime: '14:00',
      endTime: '14:45',
      status: 'pending',
    },
  });

  await prisma.booking.create({
    data: {
      salonId: salon.id,
      employeeId: khalid.id,
      serviceId: lineup.id,
      customerId: customer3.id,
      date: '2026-04-02',
      startTime: '15:00',
      endTime: '15:45',
      status: 'confirmed',
    },
  });

  console.log('Seed complete!');
  console.log(`Salon: ${salon.name} (ID: ${salon.id})`);
  console.log(`Login: khalid@blessedbarbers.nl / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
