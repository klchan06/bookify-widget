import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.API_URL || 'http://localhost:3001';

let token = '';
let salonId = '';
let employeeId = '';

async function api(path: string, opts?: RequestInit) {
  const { headers: optHeaders, ...rest } = opts || {};
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(optHeaders as Record<string, string>),
    },
  });
  let body: any;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function authApi(path: string, opts?: RequestInit) {
  const { headers: optHeaders, ...rest } = opts || {};
  return api(path, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(optHeaders as Record<string, string>),
    },
  });
}

/** Get the next occurrence of a given weekday (1=Mon..5=Fri, 0=Sun, 6=Sat) at least N days from today */
function getNextDayOfWeek(dow: number, minDaysAhead = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getNextWorkday(minDaysAhead = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getNextSunday(minDaysAhead = 1): string {
  return getNextDayOfWeek(0, minDaysAhead);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('Bookify Functional Tests', () => {
  let testServiceId = '';
  let testEmployee2Id = '';

  // ========== SETUP ==========
  beforeAll(async () => {
    // Register a fresh salon for testing
    const uniq = Date.now().toString(36);
    const regRes = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        salonName: `FuncTest Salon ${uniq}`,
        ownerName: 'Test Owner',
        email: `functest-${uniq}@test.com`,
        password: 'test1234',
        phone: '0612345000',
      }),
    });
    expect(regRes.status).toBe(201);
    token = regRes.body.data.token;
    salonId = regRes.body.data.user.salonId;
    employeeId = regRes.body.data.user.employeeId;

    // Set up working hours for the owner (Mon-Fri 09:00-18:00)
    const hours = [];
    for (let d = 0; d <= 6; d++) {
      hours.push({
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '18:00',
        isWorking: d >= 1 && d <= 5, // Mon-Fri
      });
    }
    await authApi(`/api/employees/${employeeId}/working-hours`, {
      method: 'PUT',
      body: JSON.stringify(hours),
    });

    // Create a test service assigned to the owner
    const svcRes = await authApi('/api/services', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Knipbeurt',
        duration: 45,
        price: 2500,
        employeeIds: [employeeId],
      }),
    });
    expect(svcRes.status).toBe(201);
    testServiceId = svcRes.body.data.id;
  });

  // ========== 1. RECURRING BOOKINGS - COUNT ==========
  describe('1. Recurring Bookings - Count', () => {
    it('should create exactly 10 bookings when endAfter=10', async () => {
      const date = getNextWorkday(2);
      const res = await authApi('/api/bookings/recurring', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date,
          startTime: '09:00',
          customerName: 'Recur Tien',
          customerEmail: 'recur10@test.com',
          recurring: { frequency: 'weekly', endAfter: 10 },
        }),
      });
      expect(res.status).toBe(201);
      expect(res.body.data.length).toBe(10);
    });

    it('should create exactly 20 bookings when endAfter=20', async () => {
      const date = getNextWorkday(2);
      const res = await authApi('/api/bookings/recurring', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date,
          startTime: '16:00',
          customerName: 'Recur Twintig',
          customerEmail: 'recur20@test.com',
          recurring: { frequency: 'weekly', endAfter: 20 },
        }),
      });
      expect(res.status).toBe(201);
      // Should allow up to 20
      expect(res.body.data.length).toBe(20);
    });
  });

  // ========== 2. RECURRING BOOKINGS - DATE END ==========
  describe('2. Recurring Bookings - Date End', () => {
    it('should stop recurring bookings on or before endDate', async () => {
      const startDate = getNextWorkday(2);
      const endDate = addDays(startDate, 28); // ~4 weeks
      const res = await authApi('/api/bookings/recurring', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: startDate,
          startTime: '11:00',
          customerName: 'Recur EndDate',
          customerEmail: 'recurend@test.com',
          recurring: { frequency: 'weekly', endDate },
        }),
      });
      expect(res.status).toBe(201);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // All booking dates should be <= endDate
      for (const b of res.body.data) {
        expect(b.date <= endDate).toBe(true);
      }
    });
  });

  // ========== 3. SERVICE ACTIVATION/DEACTIVATION ==========
  describe('3. Service Activation/Deactivation', () => {
    let inactiveServiceId = '';

    it('should show active service in public list', async () => {
      const svcRes = await authApi('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Actieve Dienst',
          duration: 30,
          price: 1500,
          employeeIds: [employeeId],
        }),
      });
      expect(svcRes.status).toBe(201);
      inactiveServiceId = svcRes.body.data.id;

      const listRes = await api(`/api/services?salonId=${salonId}`);
      const ids = listRes.body.data.map((s: any) => s.id);
      expect(ids).toContain(inactiveServiceId);
    });

    it('should NOT show inactive service in public list', async () => {
      await authApi(`/api/services/${inactiveServiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: false }),
      });

      const listRes = await api(`/api/services?salonId=${salonId}`);
      const ids = listRes.body.data.map((s: any) => s.id);
      expect(ids).not.toContain(inactiveServiceId);
    });

    it('should NOT allow booking an inactive service', async () => {
      const date = getNextWorkday(2);
      const res = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: inactiveServiceId,
          employeeId,
          date,
          startTime: '10:00',
          customerName: 'Should Fail',
          customerEmail: 'fail@test.com',
        }),
      });
      expect(res.status).toBe(404);
    });
  });

  // ========== 4. EMPLOYEE ACTIVATION/DEACTIVATION ==========
  describe('4. Employee Activation/Deactivation', () => {
    it('should not show inactive employee in public list', async () => {
      // Create a second employee
      const empRes = await authApi('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Inactive Emp',
          email: `inactive-${Date.now()}@test.com`,
          password: 'test1234',
        }),
      });
      expect(empRes.status).toBe(201);
      testEmployee2Id = empRes.body.data.id;

      // Deactivate
      await authApi(`/api/employees/${testEmployee2Id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: false }),
      });

      // Check public list
      const listRes = await api(`/api/employees?salonId=${salonId}`);
      const ids = listRes.body.data.map((e: any) => e.id);
      expect(ids).not.toContain(testEmployee2Id);
    });
  });

  // ========== 5. WORKING HOURS ENFORCEMENT ==========
  describe('5. Working Hours Enforcement', () => {
    it('should return 0 slots for Sunday (non-working day)', async () => {
      const sunday = getNextSunday(2);
      const res = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${sunday}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.data.slots.length).toBe(0);
    });

    it('should return slots for a Monday (working day)', async () => {
      const monday = getNextDayOfWeek(1, 2);
      const res = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${monday}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.data.slots.length).toBeGreaterThan(0);
    });

    it('should fail to book outside working hours (Sunday)', async () => {
      const sunday = getNextSunday(2);
      const res = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: sunday,
          startTime: '10:00',
          customerName: 'Sunday Book',
          customerEmail: 'sunday@test.com',
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ========== 6. BREAK TIME ENFORCEMENT ==========
  describe('6. Break Time Enforcement', () => {
    it('should not offer slots overlapping with breaks', async () => {
      // Get a workday and its dow
      const workday = getNextWorkday(2);
      const dow = new Date(workday + 'T00:00:00').getDay();

      // Set break 12:30-13:00 for that day
      await authApi(`/api/employees/${employeeId}/breaks`, {
        method: 'PUT',
        body: JSON.stringify([{ dayOfWeek: dow, startTime: '12:30', endTime: '13:00' }]),
      });

      const res = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${workday}`,
      );
      expect(res.status).toBe(200);

      // No available slot at 12:30 or times that would overlap the break
      const slotTimes = res.body.data.slots.filter((s: any) => s.available).map((s: any) => s.time);
      // 12:30 should not be available (break starts there)
      expect(slotTimes).not.toContain('12:30');

      // Clean up breaks
      await authApi(`/api/employees/${employeeId}/breaks`, {
        method: 'PUT',
        body: JSON.stringify([]),
      });
    });
  });

  // ========== 7. DOUBLE BOOKING PREVENTION ==========
  describe('7. Double Booking Prevention', () => {
    it('should prevent overlapping bookings and allow adjacent ones', async () => {
      const workday = getNextWorkday(3);

      // Book 10:00 for 45 min service (ends 10:45)
      const book1 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '10:00',
          customerName: 'First Book',
          customerEmail: 'first@test.com',
        }),
      });
      expect(book1.status).toBe(201);

      // 10:15 should fail
      const book2 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '10:15',
          customerName: 'Overlap 1',
          customerEmail: 'overlap1@test.com',
        }),
      });
      expect(book2.status).toBe(400);

      // 10:30 should fail
      const book3 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '10:30',
          customerName: 'Overlap 2',
          customerEmail: 'overlap2@test.com',
        }),
      });
      expect(book3.status).toBe(400);

      // 10:45 should succeed (adjacent, no overlap)
      const book4 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '10:45',
          customerName: 'Adjacent',
          customerEmail: 'adjacent@test.com',
        }),
      });
      expect(book4.status).toBe(201);
    });
  });

  // ========== 8. CUSTOMER DEDUPLICATION ==========
  describe('8. Customer Deduplication', () => {
    it('should reuse same customer for same email', async () => {
      const workday = getNextWorkday(4);
      const email = `dedup-${Date.now()}@test.com`;

      const book1 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '14:00',
          customerName: 'Dedup One',
          customerEmail: email,
          customerPhone: '0699990001',
        }),
      });
      expect(book1.status).toBe(201);
      const custId1 = book1.body.data.customerId;

      // Same email, different name
      const book2 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '15:00',
          customerName: 'Dedup Two',
          customerEmail: email,
          customerPhone: '0699990002',
        }),
      });
      expect(book2.status).toBe(201);
      expect(book2.body.data.customerId).toBe(custId1);
    });

    it('should reuse same customer for same phone', async () => {
      const workday = getNextWorkday(12);
      const phone = `06${Date.now().toString().slice(-8)}`;

      const book1 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '14:00',
          customerName: 'Phone One',
          customerEmail: `phoneone-${Date.now()}@test.com`,
          customerPhone: phone,
        }),
      });
      expect(book1.status).toBe(201);
      const custId1 = book1.body.data.customerId;

      // Different email, same phone
      const book2 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '15:00',
          customerName: 'Phone Two',
          customerEmail: `phonetwo-${Date.now()}@test.com`,
          customerPhone: phone,
        }),
      });
      expect(book2.status).toBe(201);
      expect(book2.body.data.customerId).toBe(custId1);
    });
  });

  // ========== 9. BOOKING STATUS FLOW ==========
  describe('9. Booking Status Flow', () => {
    let bookingId = '';

    it('should create booking with confirmed status', async () => {
      const workday = getNextWorkday(6);
      const res = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '09:00',
          customerName: 'Status Test',
          customerEmail: `statustest-${Date.now()}@test.com`,
        }),
      });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('confirmed');
      bookingId = res.body.data.id;
    });

    it('should allow setting status to completed', async () => {
      const res = await authApi(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });

    it('should allow setting status to cancelled', async () => {
      const res = await authApi(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should reject invalid status', async () => {
      const res = await authApi(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'invalid_status' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ========== 10. BOOKING CANCELLATION ==========
  describe('10. Booking Cancellation', () => {
    it('should cancel with reason and free up the time slot', async () => {
      const workday = getNextWorkday(7);
      // Book a slot
      const book = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '09:00',
          customerName: 'Cancel Test',
          customerEmail: `cancel-${Date.now()}@test.com`,
        }),
      });
      expect(book.status).toBe(201);
      const bookingId = book.body.data.id;

      // Cancel with reason
      const cancelRes = await api(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancelReason: 'Klant ziek' }),
      });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');
      expect(cancelRes.body.data.cancelReason).toBe('Klant ziek');

      // Verify the slot is available again
      const avail = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${workday}&employeeId=${employeeId}`,
      );
      const slot0900 = avail.body.data.slots.find((s: any) => s.time === '09:00');
      expect(slot0900).toBeDefined();
      expect(slot0900.available).toBe(true);
    });
  });

  // ========== 11. SERVICE PRICE/DURATION UPDATE ==========
  describe('11. Service Price/Duration Update', () => {
    it('should allow updating service price', async () => {
      // Update test service price
      const upd = await authApi(`/api/services/${testServiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ price: 3000 }),
      });
      expect(upd.status).toBe(200);
      expect(upd.body.data.price).toBe(3000);

      // Revert
      await authApi(`/api/services/${testServiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ price: 2500 }),
      });
    });
  });

  // ========== 12. CUSTOMER CRUD ==========
  describe('12. Customer CRUD', () => {
    let customerId = '';

    it('should create customer with auto-generated customerNumber', async () => {
      const res = await authApi('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Jan',
          lastName: 'Jansen',
          email: `crud-${Date.now()}@test.com`,
          phone: '0611112222',
        }),
      });
      expect(res.status).toBe(201);
      expect(res.body.data.customerNumber).toMatch(/^C\d{6}$/);
      customerId = res.body.data.id;
    });

    it('should update customer phone', async () => {
      const res = await authApi(`/api/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify({ phone: '0633334444' }),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('0633334444');
    });

    it('should soft delete customer', async () => {
      const delRes = await authApi(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      expect(delRes.status).toBe(200);

      // Should not appear in export (active only)
      const exp = await authApi('/api/customers/export');
      const ids = exp.body.data.map((c: any) => c.id);
      expect(ids).not.toContain(customerId);
    });
  });

  // ========== 13. CUSTOMER IMPORT/EXPORT ==========
  describe('13. Customer Import/Export', () => {
    const importUniq = Date.now().toString(36);

    it('should import 5 customers', async () => {
      const customers = Array.from({ length: 5 }, (_, i) => ({
        name: `Import User ${i}`,
        firstName: 'Import',
        lastName: `User${i}`,
        email: `import${i}-${importUniq}@test.com`,
        phone: `061000${String(i).padStart(4, '0')}`,
      }));

      const res = await authApi('/api/customers/import', {
        method: 'POST',
        body: JSON.stringify({ customers }),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(5);
    });

    it('should update (not create) when importing same 5 again', async () => {
      const customers = Array.from({ length: 5 }, (_, i) => ({
        name: `Import User ${i} Updated`,
        firstName: 'Import',
        lastName: `User${i}`,
        email: `import${i}-${importUniq}@test.com`,
        phone: `061000${String(i).padStart(4, '0')}`,
      }));

      const res = await authApi('/api/customers/import', {
        method: 'POST',
        body: JSON.stringify({ customers }),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(0);
      expect(res.body.data.updated).toBe(5);
    });

    it('should export customers', async () => {
      const res = await authApi('/api/customers/export');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ========== 14. CUSTOMER MERGE ==========
  describe('14. Customer Merge', () => {
    it('should merge two customers and transfer bookings', async () => {
      const uniq = Date.now().toString(36);
      const workday = getNextWorkday(8);

      // Create 2 customers via bookings
      const b1 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '09:00',
          customerName: 'Merge Cust A',
          customerEmail: `mergea-${uniq}@test.com`,
        }),
      });
      expect(b1.status).toBe(201);
      const custA = b1.body.data.customerId;
      const bookingA = b1.body.data.id;

      const b2 = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          serviceId: testServiceId,
          employeeId,
          date: workday,
          startTime: '11:00',
          customerName: 'Merge Cust B',
          customerEmail: `mergeb-${uniq}@test.com`,
        }),
      });
      expect(b2.status).toBe(201);
      const custB = b2.body.data.customerId;

      // Merge B into A
      const mergeRes = await authApi('/api/customers/merge', {
        method: 'POST',
        body: JSON.stringify({ keepId: custA, mergeIds: [custB] }),
      });
      expect(mergeRes.status).toBe(200);

      // Verify custA now has both bookings
      const bookingsRes = await authApi(`/api/customers/${custA}/bookings`);
      expect(bookingsRes.status).toBe(200);
      expect(bookingsRes.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ========== 15. BOOKING STATS ==========
  describe('15. Booking Stats', () => {
    it('should reflect new bookings in todayCount', async () => {
      const stats1 = await authApi('/api/bookings/stats');
      expect(stats1.status).toBe(200);
      const before = stats1.body.data.todayCount;

      // We need a booking for TODAY. Use auto-assign to find a slot.
      const today = new Date().toISOString().split('T')[0];
      const avail = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${today}`,
      );
      // If there are available slots today, book one
      const availSlots = (avail.body.data?.slots || []).filter((s: any) => s.available);
      if (availSlots.length > 0) {
        const slot = availSlots[0];
        await api('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            salonId,
            serviceId: testServiceId,
            employeeId,
            date: today,
            startTime: slot.time,
            customerName: 'Stats Test',
            customerEmail: `stats-${Date.now()}@test.com`,
          }),
        });

        const stats2 = await authApi('/api/bookings/stats');
        expect(stats2.body.data.todayCount).toBe(before + 1);
      } else {
        // No slots available today (lead time etc) - just verify stats endpoint works
        expect(stats1.body.data).toHaveProperty('todayCount');
        expect(stats1.body.data).toHaveProperty('weekCount');
        expect(stats1.body.data).toHaveProperty('monthRevenue');
        expect(stats1.body.data).toHaveProperty('totalCustomers');
      }
    });
  });

  // ========== 16. AVAILABILITY LEAD TIME ==========
  describe('16. Availability Lead Time', () => {
    it('should not offer slots within lead time window', async () => {
      // Default bookingLeadTime = 2 hours
      const today = new Date().toISOString().split('T')[0];
      const avail = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${today}`,
      );
      expect(avail.status).toBe(200);

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const cutoff = currentMinutes + 2 * 60; // 2 hour lead time

      // Any available slot should be after the cutoff
      for (const slot of avail.body.data.slots) {
        if (slot.available) {
          const [h, m] = slot.time.split(':').map(Number);
          expect(h * 60 + m).toBeGreaterThanOrEqual(cutoff);
        }
      }
    });
  });

  // ========== 17. EMAIL TEMPLATES ==========
  describe('17. Email Templates', () => {
    it('should have 4 default templates', async () => {
      const res = await authApi('/api/salon/email-templates');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);
    });

    it('should update a template subject', async () => {
      const res = await authApi('/api/salon/email-templates/booking_confirmation', {
        method: 'PUT',
        body: JSON.stringify({ subject: 'Uw afspraak is bevestigd!!!' }),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.subject).toBe('Uw afspraak is bevestigd!!!');
    });

    it('should preview template with sample data', async () => {
      const res = await authApi('/api/salon/email-templates/booking_confirmation/preview', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.subject).toContain('bevestigd');
      expect(res.body.data.body).toContain('Jan de Vries');
    });
  });

  // ========== 18. ICAL FEED ==========
  describe('18. iCal Feed', () => {
    it('should return feed URLs', async () => {
      const res = await authApi('/api/calendar/feed-url');
      expect(res.status).toBe(200);
      expect(res.body.data.personalFeed).toContain('.ics');
      expect(res.body.data.salonFeed).toContain('.ics');
    });

    it('should return valid iCal data', async () => {
      const feedRes = await authApi('/api/calendar/feed-url');
      const feedUrl = feedRes.body.data.salonFeed;
      // Extract the path from the URL
      const path = new URL(feedUrl).pathname;
      const icalRes = await api(path);
      expect(typeof icalRes.body).toBe('string');
      expect(icalRes.body).toContain('BEGIN:VCALENDAR');
    });
  });

  // ========== 19. SPECIAL DAYS (EMPLOYEE DAY OFF) ==========
  describe('19. Special Days', () => {
    it('should return 0 slots on a day off and restore after deletion', async () => {
      const workday = getNextWorkday(10);

      // Add special day off
      const addRes = await authApi(`/api/employees/${employeeId}/special-days`, {
        method: 'POST',
        body: JSON.stringify({ date: workday, isOff: true, reason: 'Vakantie' }),
      });
      expect(addRes.status).toBe(201);
      const specialDayId = addRes.body.data.id;

      // Check availability - should be 0
      const avail1 = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${workday}`,
      );
      expect(avail1.body.data.slots.length).toBe(0);

      // Delete the special day
      await authApi(`/api/employees/${employeeId}/special-days/${specialDayId}`, {
        method: 'DELETE',
      });

      // Check availability again - should have slots
      const avail2 = await api(
        `/api/availability?salonId=${salonId}&serviceId=${testServiceId}&date=${workday}`,
      );
      expect(avail2.body.data.slots.length).toBeGreaterThan(0);
    });
  });

  // ========== 20. SERVICE REORDER ==========
  describe('20. Service Reorder', () => {
    it('should persist new service order', async () => {
      // Create 3 services
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await authApi('/api/services', {
          method: 'POST',
          body: JSON.stringify({
            name: `Reorder Svc ${i}`,
            duration: 30,
            price: 1000 + i * 500,
            employeeIds: [employeeId],
          }),
        });
        expect(res.status).toBe(201);
        ids.push(res.body.data.id);
      }

      // Reorder: reverse
      const reversed = [...ids].reverse();
      const reorderRes = await authApi('/api/services/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ids: reversed }),
      });
      expect(reorderRes.status).toBe(200);

      // Verify order in GET (sorted by sortOrder)
      const listRes = await api(`/api/services?salonId=${salonId}`);
      const returnedIds = listRes.body.data.map((s: any) => s.id);
      // reversed[0] should come before reversed[1] which should come before reversed[2]
      const idx0 = returnedIds.indexOf(reversed[0]);
      const idx1 = returnedIds.indexOf(reversed[1]);
      const idx2 = returnedIds.indexOf(reversed[2]);
      expect(idx0).toBeLessThan(idx1);
      expect(idx1).toBeLessThan(idx2);
    });
  });
});
