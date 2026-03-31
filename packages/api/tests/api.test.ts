import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function api(path: string, options?: RequestInit) {
  const { headers: optHeaders, ...restOptions } = options || {};
  const res = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(optHeaders as Record<string, string>),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function authApi(path: string, token: string, options?: RequestInit) {
  const { headers: optHeaders, ...restOptions } = options || {};
  return api(path, {
    ...restOptions,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(optHeaders as Record<string, string>),
    },
  });
}

function getNextWorkday(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

function getNextSunday(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

describe('Bookify API - Complete Feature Test', () => {
  let token: string;
  let salonId: string;
  let employeeId: string; // owner
  let employee2Id: string;
  let serviceId: string;
  let service2Id: string;
  let customerId: string;
  let bookingId: string;

  // ========== AUTH ==========
  describe('Auth', () => {
    it('should register a new salon', async () => {
      const { status, body } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          salonName: 'Test Barbershop',
          ownerName: 'Test Owner',
          email: 'test@barbershop.nl',
          password: 'test123456',
          phone: '0612345678',
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe('test@barbershop.nl');
      expect(body.data.user.role).toBe('owner');
      token = body.data.token;
      salonId = body.data.user.salonId;
      employeeId = body.data.user.employeeId;
    });

    it('should not register duplicate email', async () => {
      const { status, body } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          salonName: 'Duplicate',
          ownerName: 'Duplicate',
          email: 'test@barbershop.nl',
          password: 'test123456',
          phone: '0612345678',
        }),
      });
      expect(status).toBe(409);
      expect(body.success).toBe(false);
    });

    it('should login with correct credentials', async () => {
      const { status, body } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@barbershop.nl',
          password: 'test123456',
        }),
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.salonId).toBe(salonId);
    });

    it('should reject wrong password', async () => {
      const { status, body } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@barbershop.nl',
          password: 'wrongpassword',
        }),
      });
      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const { status, body } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'doesnotexist@example.com',
          password: 'test123456',
        }),
      });
      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    it('should get current user with valid token', async () => {
      const { status, body } = await authApi('/api/auth/me', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('test@barbershop.nl');
      expect(body.data.name).toBe('Test Owner');
      expect(body.data.salon).toBeDefined();
      expect(body.data.salon.name).toBe('Test Barbershop');
    });

    it('should reject request without token', async () => {
      const { status } = await api('/api/auth/me');
      expect(status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const { status } = await authApi('/api/auth/me', 'invalid-token-here');
      expect(status).toBe(401);
    });
  });

  // ========== SALON ==========
  describe('Salon', () => {
    it('should get salon by id (public)', async () => {
      const { status, body } = await api(`/api/salon?id=${salonId}`);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Barbershop');
      expect(body.data.slug).toBeDefined();
    });

    it('should get salon by slug (public)', async () => {
      const { body: salonBody } = await api(`/api/salon?id=${salonId}`);
      const slug = salonBody.data.slug;

      const { status, body } = await api(`/api/salon?slug=${slug}`);
      expect(status).toBe(200);
      expect(body.data.id).toBe(salonId);
    });

    it('should return 400 when no slug or id provided', async () => {
      const { status } = await api('/api/salon');
      expect(status).toBe(400);
    });

    it('should return 404 for non-existent salon', async () => {
      const { status } = await api('/api/salon?id=00000000-0000-0000-0000-000000000000');
      expect(status).toBe(404);
    });

    it('should get own salon (authenticated)', async () => {
      const { status, body } = await authApi('/api/salon/me', token);
      expect(status).toBe(200);
      expect(body.data.id).toBe(salonId);
      expect(body.data.name).toBe('Test Barbershop');
    });

    it('should update salon', async () => {
      const { status, body } = await authApi('/api/salon', token, {
        method: 'PUT',
        body: JSON.stringify({
          address: 'Teststraat 1',
          city: 'Amsterdam',
          postalCode: '1234 AB',
        }),
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.address).toBe('Teststraat 1');
      expect(body.data.city).toBe('Amsterdam');
      expect(body.data.postalCode).toBe('1234 AB');
    });

    it('should get widget config (public)', async () => {
      const { status, body } = await api(`/api/salon/widget-config/${salonId}`);
      expect(status).toBe(200);
      expect(body.data.salonId).toBe(salonId);
      expect(body.data.salonName).toBe('Test Barbershop');
      expect(body.data.primaryColor).toBeDefined();
      expect(body.data.locale).toBe('nl');
    });

    it('should return 404 for widget config of non-existent salon', async () => {
      const { status } = await api('/api/salon/widget-config/00000000-0000-0000-0000-000000000000');
      expect(status).toBe(404);
    });

    it('should get salon settings', async () => {
      const { status, body } = await authApi('/api/salon/settings', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.salonId).toBe(salonId);
      // Check defaults
      expect(body.data.bookingLeadTime).toBe(2);
      expect(body.data.bookingWindow).toBe(30);
      expect(body.data.slotDuration).toBe(15);
    });

    it('should update salon settings', async () => {
      const { status, body } = await authApi('/api/salon/settings', token, {
        method: 'PUT',
        body: JSON.stringify({
          bookingLeadTime: 1,
          bookingWindow: 60,
          slotDuration: 45,
          requirePhone: true,
        }),
      });
      expect(status).toBe(200);
      expect(body.data.slotDuration).toBe(45);
      expect(body.data.bookingLeadTime).toBe(1);
      expect(body.data.bookingWindow).toBe(60);
      expect(body.data.requirePhone).toBe(true);
    });

    it('should reset slot duration to 15 for subsequent tests', async () => {
      const { status } = await authApi('/api/salon/settings', token, {
        method: 'PUT',
        body: JSON.stringify({
          slotDuration: 15,
          bookingLeadTime: 0,
          bookingWindow: 90,
        }),
      });
      expect(status).toBe(200);
    });
  });

  // ========== SERVICES ==========
  describe('Services', () => {
    it('should create a service', async () => {
      const { status, body } = await authApi('/api/services', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Knippen',
          description: 'Haar knippen',
          duration: 30,
          price: 2000,
          category: 'Haar',
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Knippen');
      expect(body.data.price).toBe(2000);
      expect(body.data.duration).toBe(30);
      expect(body.data.salonId).toBe(salonId);
      serviceId = body.data.id;
    });

    it('should create a second service', async () => {
      const { status, body } = await authApi('/api/services', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Baard',
          description: 'Baard trimmen',
          duration: 30,
          price: 1000,
          category: 'Baard',
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      service2Id = body.data.id;
    });

    it('should create service with employee assignment', async () => {
      const { status, body } = await authApi('/api/services', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Wassen + Knippen',
          description: 'Haar wassen en knippen',
          duration: 45,
          price: 3000,
          category: 'Haar',
          employeeIds: [employeeId],
        }),
      });
      expect(status).toBe(201);
      expect(body.data.employeeServices.length).toBe(1);
      // Clean up: soft delete this service
      await authApi(`/api/services/${body.data.id}`, token, { method: 'DELETE' });
    });

    it('should list services (public with salonId)', async () => {
      const { status, body } = await api(`/api/services?salonId=${salonId}`);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should list services (authenticated, no salonId)', async () => {
      const { status, body } = await authApi('/api/services', token);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 400 without salonId and without auth', async () => {
      const { status, body } = await api('/api/services');
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should update a service', async () => {
      const { status, body } = await authApi(`/api/services/${serviceId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ price: 2500 }),
      });
      expect(status).toBe(200);
      expect(body.data.price).toBe(2500);
    });

    it('should return 404 when updating non-existent service', async () => {
      const { status } = await authApi('/api/services/00000000-0000-0000-0000-000000000000', token, {
        method: 'PUT',
        body: JSON.stringify({ price: 999 }),
      });
      expect(status).toBe(404);
    });

    it('should reorder services', async () => {
      const { status, body } = await authApi('/api/services/reorder', token, {
        method: 'PUT',
        body: JSON.stringify({ ids: [service2Id, serviceId] }),
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should reject reorder without ids array', async () => {
      const { status, body } = await authApi('/api/services/reorder', token, {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // ========== EMPLOYEES ==========
  describe('Employees', () => {
    it('should list employees (includes owner)', async () => {
      const { status, body } = await authApi('/api/employees', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      // Owner should be in the list
      const owner = body.data.find((e: any) => e.role === 'owner');
      expect(owner).toBeDefined();
      expect(owner.name).toBe('Test Owner');
    });

    it('should list employees (public with salonId)', async () => {
      const { status, body } = await api(`/api/employees?salonId=${salonId}`);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 without salonId and without auth', async () => {
      const { status } = await api('/api/employees');
      expect(status).toBe(400);
    });

    it('should create a new employee', async () => {
      const { status, body } = await authApi('/api/employees', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Medewerker Test',
          email: 'medewerker@barbershop.nl',
          phone: '0687654321',
          role: 'employee',
          password: 'test123456',
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Medewerker Test');
      expect(body.data.email).toBe('medewerker@barbershop.nl');
      expect(body.data.role).toBe('employee');
      expect(body.data.passwordHash).toBeUndefined();
      employee2Id = body.data.id;
    });

    it('should get employee by id', async () => {
      const { status, body } = await authApi(`/api/employees/${employee2Id}`, token);
      expect(status).toBe(200);
      expect(body.data.name).toBe('Medewerker Test');
      expect(body.data.workingHours).toBeDefined();
      expect(body.data.breaks).toBeDefined();
      expect(body.data.specialDays).toBeDefined();
    });

    it('should return 404 for non-existent employee', async () => {
      const { status } = await api('/api/employees/00000000-0000-0000-0000-000000000000');
      expect(status).toBe(404);
    });

    it('should update an employee', async () => {
      const { status, body } = await authApi(`/api/employees/${employee2Id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ phone: '0699999999' }),
      });
      expect(status).toBe(200);
      expect(body.data.phone).toBe('0699999999');
    });

    it('should set working hours for employee', async () => {
      const hours = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '20:00', isWorking: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isWorking: true },
        { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isWorking: false },
      ];
      const { status, body } = await authApi(`/api/employees/${employee2Id}/working-hours`, token, {
        method: 'PUT',
        body: JSON.stringify(hours),
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(7);
    });

    it('should get working hours for employee', async () => {
      const { status, body } = await api(`/api/employees/${employee2Id}/working-hours`);
      expect(status).toBe(200);
      expect(body.data.length).toBe(7);
    });

    it('should accept wrapped working hours format (with hours property)', async () => {
      const hours = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorking: true },
        { dayOfWeek: 6, startTime: '10:00', endTime: '16:00', isWorking: true },
        { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isWorking: false },
      ];
      const { status, body } = await authApi(`/api/employees/${employeeId}/working-hours`, token, {
        method: 'PUT',
        body: JSON.stringify({ hours }),
      });
      expect(status).toBe(200);
      expect(body.data.length).toBe(7);
    });

    it('should set breaks for employee', async () => {
      const breaks = [
        { dayOfWeek: 1, startTime: '12:30', endTime: '13:00' },
        { dayOfWeek: 2, startTime: '12:30', endTime: '13:00' },
      ];
      const { status, body } = await authApi(`/api/employees/${employee2Id}/breaks`, token, {
        method: 'PUT',
        body: JSON.stringify(breaks),
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it('should get breaks for employee', async () => {
      const { status, body } = await api(`/api/employees/${employee2Id}/breaks`);
      expect(status).toBe(200);
      expect(body.data.length).toBe(2);
    });

    it('should add special day off', async () => {
      const { status, body } = await authApi(`/api/employees/${employee2Id}/special-days`, token, {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-12-25',
          isOff: true,
          reason: 'Kerst',
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.isOff).toBe(true);
      expect(body.data.reason).toBe('Kerst');
    });

    it('should get special days for employee', async () => {
      const { status, body } = await api(`/api/employees/${employee2Id}/special-days`);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should upsert special day (update existing)', async () => {
      const { status, body } = await authApi(`/api/employees/${employee2Id}/special-days`, token, {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-12-25',
          isOff: true,
          reason: 'Eerste Kerstdag',
        }),
      });
      expect(status).toBe(201);
      expect(body.data.reason).toBe('Eerste Kerstdag');
    });

    it('should link employee to services via service update', async () => {
      const { status, body } = await authApi(`/api/services/${serviceId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          employeeIds: [employeeId, employee2Id],
        }),
      });
      expect(status).toBe(200);
      expect(body.data.employeeServices.length).toBe(2);
    });

    it('should also link second service to employee', async () => {
      const { status } = await authApi(`/api/services/${service2Id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          employeeIds: [employee2Id],
        }),
      });
      expect(status).toBe(200);
    });

    it('should filter employees by serviceId', async () => {
      const { status, body } = await api(`/api/employees?salonId=${salonId}&serviceId=${serviceId}`);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      // employee2 should be in the list
      const found = body.data.find((e: any) => e.id === employee2Id);
      expect(found).toBeDefined();
    });
  });

  // ========== AVAILABILITY ==========
  describe('Availability', () => {
    it('should return available slots for a workday', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api(
        `/api/availability?salonId=${salonId}&serviceId=${serviceId}&employeeId=${employee2Id}&date=${futureDate}`
      );
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.date).toBe(futureDate);
      expect(body.data.slots).toBeDefined();
      expect(Array.isArray(body.data.slots)).toBe(true);
      expect(body.data.slots.length).toBeGreaterThan(0);
      // All returned slots should be available
      body.data.slots.forEach((slot: any) => {
        expect(slot.available).toBe(true);
        expect(slot.time).toBeDefined();
        expect(slot.employeeId).toBe(employee2Id);
      });
    });

    it('should return slots without specifying employeeId (auto-assign)', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api(
        `/api/availability?salonId=${salonId}&serviceId=${serviceId}&date=${futureDate}`
      );
      expect(status).toBe(200);
      expect(body.data.slots.length).toBeGreaterThan(0);
    });

    it('should return no slots for Sunday (day off)', async () => {
      const sunday = getNextSunday();
      const { status, body } = await api(
        `/api/availability?salonId=${salonId}&serviceId=${serviceId}&employeeId=${employee2Id}&date=${sunday}`
      );
      expect(status).toBe(200);
      // Sunday is set as isWorking: false, so no slots should be returned
      expect(body.data.slots.length).toBe(0);
    });

    it('should return no slots for special day off (Christmas)', async () => {
      const { status, body } = await api(
        `/api/availability?salonId=${salonId}&serviceId=${serviceId}&employeeId=${employee2Id}&date=2026-12-25`
      );
      expect(status).toBe(200);
      expect(body.data.slots.length).toBe(0);
    });

    it('should return 400 when missing required query params', async () => {
      const { status } = await api('/api/availability?serviceId=x&date=2026-04-01');
      expect(status).toBe(400);
    });

    it('should return 400 for invalid date format', async () => {
      const { status } = await api(
        `/api/availability?salonId=${salonId}&serviceId=${serviceId}&date=invalid`
      );
      expect(status).toBe(400);
    });
  });

  // ========== BOOKINGS ==========
  describe('Bookings', () => {
    it('should create a booking (public)', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '10:00',
          customerName: 'Jan de Vries',
          customerEmail: 'jan@example.com',
          customerPhone: '0611111111',
          notes: 'Graag kort aan de zijkanten',
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('confirmed');
      expect(body.data.date).toBe(futureDate);
      expect(body.data.startTime).toBe('10:00');
      expect(body.data.endTime).toBe('10:30'); // 30 min service
      expect(body.data.customer.name).toBe('Jan de Vries');
      expect(body.data.customer.email).toBe('jan@example.com');
      expect(body.data.employee.id).toBe(employee2Id);
      expect(body.data.service.id).toBe(serviceId);
      expect(body.data.notes).toBe('Graag kort aan de zijkanten');
      bookingId = body.data.id;
      customerId = body.data.customerId;
    });

    it('should not double-book same slot', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '10:00',
          customerName: 'Piet Bakker',
          customerEmail: 'piet@example.com',
        }),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should not book overlapping slot', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '10:15',
          customerName: 'Overlapper',
          customerEmail: 'overlap@example.com',
        }),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should book adjacent slot (after the first booking ends)', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '10:30',
          customerName: 'Piet Bakker',
          customerEmail: 'piet@example.com',
        }),
      });
      expect(status).toBe(201);
      expect(body.data.startTime).toBe('10:30');
      expect(body.data.endTime).toBe('11:00');
    });

    it('should auto-assign employee when not specified', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          date: futureDate,
          startTime: '14:00',
          customerName: 'Auto Assign Test',
          customerEmail: 'auto@example.com',
        }),
      });
      expect(status).toBe(201);
      expect(body.data.employeeId).toBeDefined();
    });

    it('should list bookings (authenticated)', async () => {
      const { status, body } = await authApi('/api/bookings', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.total).toBeDefined();
      expect(body.page).toBe(1);
    });

    it('should reject listing bookings without auth', async () => {
      const { status } = await api('/api/bookings');
      expect(status).toBe(401);
    });

    it('should filter bookings by date', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await authApi(`/api/bookings?date=${futureDate}`, token);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      body.data.forEach((b: any) => {
        expect(b.date).toBe(futureDate);
      });
    });

    it('should filter bookings by date range', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await authApi(
        `/api/bookings?startDate=${futureDate}&endDate=${futureDate}`,
        token
      );
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter bookings by employee', async () => {
      const { status, body } = await authApi(
        `/api/bookings?employeeId=${employee2Id}`,
        token
      );
      expect(status).toBe(200);
      body.data.forEach((b: any) => {
        expect(b.employeeId).toBe(employee2Id);
      });
    });

    it('should filter bookings by status', async () => {
      const { status, body } = await authApi('/api/bookings?status=confirmed', token);
      expect(status).toBe(200);
      body.data.forEach((b: any) => {
        expect(b.status).toBe('confirmed');
      });
    });

    it('should paginate bookings', async () => {
      const { status, body } = await authApi('/api/bookings?page=1&pageSize=2', token);
      expect(status).toBe(200);
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.pageSize).toBe(2);
      expect(body.totalPages).toBeDefined();
    });

    it('should get booking stats', async () => {
      const { status, body } = await authApi('/api/bookings/stats', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(typeof body.data.todayCount).toBe('number');
      expect(typeof body.data.weekCount).toBe('number');
      expect(typeof body.data.monthRevenue).toBe('number');
      expect(body.data.totalCustomers).toBeGreaterThanOrEqual(1);
    });

    it('should get booking by id', async () => {
      const { status, body } = await authApi(`/api/bookings/${bookingId}`, token);
      expect(status).toBe(200);
      expect(body.data.id).toBe(bookingId);
      expect(body.data.employee).toBeDefined();
      expect(body.data.service).toBeDefined();
      expect(body.data.customer).toBeDefined();
    });

    it('should return 404 for non-existent booking', async () => {
      const { status } = await authApi('/api/bookings/00000000-0000-0000-0000-000000000000', token);
      expect(status).toBe(404);
    });

    it('should update booking (reschedule time)', async () => {
      const { status, body } = await authApi(`/api/bookings/${bookingId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ startTime: '11:00' }),
      });
      expect(status).toBe(200);
      expect(body.data.startTime).toBe('11:00');
      expect(body.data.endTime).toBe('11:30'); // recalculated from service duration
    });

    it('should update booking notes', async () => {
      const { status, body } = await authApi(`/api/bookings/${bookingId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ notes: 'Gewijzigde notitie' }),
      });
      expect(status).toBe(200);
      expect(body.data.notes).toBe('Gewijzigde notitie');
    });

    it('should update booking status via PUT', async () => {
      const { status, body } = await authApi(`/api/bookings/${bookingId}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'confirmed' }),
      });
      expect(status).toBe(200);
      expect(body.data.status).toBe('confirmed');
    });

    it('should update booking status via PATCH', async () => {
      const { status, body } = await authApi(`/api/bookings/${bookingId}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      expect(status).toBe(200);
      expect(body.data.status).toBe('completed');
    });

    it('should reject invalid status', async () => {
      const { status, body } = await authApi(`/api/bookings/${bookingId}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'invalid_status' }),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should cancel a booking (public endpoint)', async () => {
      const { status, body } = await api(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancelReason: 'Test annulering' }),
      });
      expect(status).toBe(200);
      expect(body.data.status).toBe('cancelled');
      expect(body.data.cancelReason).toBe('Test annulering');
    });

    it('should create booking with privateNotes', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: service2Id,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '15:00',
          customerName: 'Private Note Test',
          customerEmail: 'private@example.com',
          privateNotes: 'Klant heeft allergie voor product X',
        }),
      });
      expect(status).toBe(201);
      expect(body.data.privateNotes).toBe('Klant heeft allergie voor product X');
    });
  });

  // ========== RECURRING BOOKINGS ==========
  describe('Recurring Bookings', () => {
    it('should create recurring weekly bookings', async () => {
      const futureDate = getNextWorkday();
      const { status, body } = await authApi('/api/bookings/recurring', token, {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '16:00',
          customerName: 'Recurring Test',
          customerEmail: 'recurring@example.com',
          recurring: {
            frequency: 'weekly',
            endAfter: 3,
          },
        }),
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      // All should share the same recurringGroupId
      const groupIds = body.data.map((b: any) => b.recurringGroupId);
      expect(new Set(groupIds).size).toBe(1);
      // All should be marked as recurring
      body.data.forEach((b: any) => {
        expect(b.isRecurring).toBe(true);
        expect(b.recurringGroupId).toBeDefined();
        expect(b.status).toBe('confirmed');
      });
    });

    it('should reject recurring booking without auth', async () => {
      const futureDate = getNextWorkday();
      const { status } = await api('/api/bookings/recurring', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '17:00',
          customerName: 'No Auth Recurring',
          customerEmail: 'noauth@example.com',
          recurring: { frequency: 'weekly', endAfter: 2 },
        }),
      });
      expect(status).toBe(401);
    });
  });

  // ========== CUSTOMERS ==========
  describe('Customers', () => {
    it('should list customers', async () => {
      const { status, body } = await authApi('/api/customers', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.total).toBeDefined();
      expect(body.page).toBe(1);
    });

    it('should reject listing customers without auth', async () => {
      const { status } = await api('/api/customers');
      expect(status).toBe(401);
    });

    it('should search customers via /search endpoint', async () => {
      const { status, body } = await authApi('/api/customers/search?q=Jan', token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].name).toContain('Jan');
    });

    it('should search customers via search query param on list', async () => {
      const { status, body } = await authApi('/api/customers?search=Jan', token);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should search by email', async () => {
      const { status, body } = await authApi('/api/customers/search?q=jan@example', token);
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty results for non-matching search', async () => {
      const { status, body } = await authApi('/api/customers/search?q=ZZZNOTFOUND', token);
      expect(status).toBe(200);
      expect(body.data.length).toBe(0);
    });

    it('should get customer by id with booking history', async () => {
      const { status, body } = await authApi(`/api/customers/${customerId}`, token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Jan de Vries');
      expect(body.data.bookings).toBeDefined();
      expect(body.data.bookings.length).toBeGreaterThanOrEqual(1);
      // Each booking should include employee and service
      body.data.bookings.forEach((b: any) => {
        expect(b.employee).toBeDefined();
        expect(b.service).toBeDefined();
      });
    });

    it('should return 404 for non-existent customer', async () => {
      const { status } = await authApi('/api/customers/00000000-0000-0000-0000-000000000000', token);
      expect(status).toBe(404);
    });

    it('should get customer bookings', async () => {
      const { status, body } = await authApi(`/api/customers/${customerId}/bookings`, token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate customers', async () => {
      const { status, body } = await authApi('/api/customers?page=1&pageSize=2', token);
      expect(status).toBe(200);
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.pageSize).toBe(2);
    });
  });

  // ========== HEALTH CHECK ==========
  describe('Health', () => {
    it('should return healthy status', async () => {
      const { status, body } = await api('/api/health');
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.timestamp).toBeDefined();
    });
  });

  // ========== VALIDATION ==========
  describe('Validation', () => {
    it('should reject invalid email on register', async () => {
      const { status, body } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          salonName: 'X',
          ownerName: 'XX',
          email: 'not-an-email',
          password: '123456',
          phone: '061234',
        }),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should reject short password on register', async () => {
      const { status } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          salonName: 'Test',
          ownerName: 'Test',
          email: 'valid@email.com',
          password: '12',
          phone: '061234',
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject short phone on register', async () => {
      const { status } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          salonName: 'Test',
          ownerName: 'Test',
          email: 'valid@email.com',
          password: '123456',
          phone: '06',
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject booking without required fields', async () => {
      const { status, body } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ salonId }),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should reject booking with invalid email', async () => {
      const futureDate = getNextWorkday();
      const { status } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: futureDate,
          startTime: '09:00',
          customerName: 'Bad Email',
          customerEmail: 'not-valid',
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject booking with invalid date format', async () => {
      const { status } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId,
          employeeId: employee2Id,
          date: '2026/04/01',
          startTime: '09:00',
          customerName: 'Bad Date',
          customerEmail: 'bad@date.com',
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject service with duration less than 5', async () => {
      const { status } = await authApi('/api/services', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Too Short',
          duration: 2,
          price: 100,
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject service with negative price', async () => {
      const { status } = await authApi('/api/services', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Negative',
          duration: 30,
          price: -100,
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject employee with invalid email', async () => {
      const { status } = await authApi('/api/employees', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bad Email Employee',
          email: 'not-an-email',
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject working hours with invalid time format', async () => {
      const { status } = await authApi(`/api/employees/${employee2Id}/working-hours`, token, {
        method: 'PUT',
        body: JSON.stringify([
          { dayOfWeek: 1, startTime: '9:00', endTime: '18:00', isWorking: true },
        ]),
      });
      expect(status).toBe(400);
    });

    it('should reject special day with invalid date format', async () => {
      const { status } = await authApi(`/api/employees/${employee2Id}/special-days`, token, {
        method: 'POST',
        body: JSON.stringify({
          date: '25-12-2026',
          isOff: true,
        }),
      });
      expect(status).toBe(400);
    });

    it('should reject invalid availability query', async () => {
      const { status } = await api(
        `/api/availability?salonId=${salonId}&serviceId=${serviceId}&date=invalid`
      );
      expect(status).toBe(400);
    });
  });

  // ========== CLEANUP OPERATIONS ==========
  describe('Cleanup operations', () => {
    it('should soft-delete a service', async () => {
      const { status, body } = await authApi(`/api/services/${service2Id}`, token, {
        method: 'DELETE',
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should not list deleted service in active services', async () => {
      const { status, body } = await api(`/api/services?salonId=${salonId}`);
      expect(status).toBe(200);
      const deleted = body.data.find((s: any) => s.id === service2Id);
      expect(deleted).toBeUndefined();
    });

    it('should soft-delete an employee', async () => {
      const { status, body } = await authApi(`/api/employees/${employee2Id}`, token, {
        method: 'DELETE',
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should not list deactivated employee in active employees', async () => {
      const { status, body } = await api(`/api/employees?salonId=${salonId}`);
      expect(status).toBe(200);
      const deactivated = body.data.find((e: any) => e.id === employee2Id);
      expect(deactivated).toBeUndefined();
    });

    it('should return 404 when deleting non-existent service', async () => {
      const { status } = await authApi('/api/services/00000000-0000-0000-0000-000000000000', token, {
        method: 'DELETE',
      });
      expect(status).toBe(404);
    });

    it('should return 404 when deleting non-existent employee', async () => {
      const { status } = await authApi('/api/employees/00000000-0000-0000-0000-000000000000', token, {
        method: 'DELETE',
      });
      expect(status).toBe(404);
    });
  });
});
