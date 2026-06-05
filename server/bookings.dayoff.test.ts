import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { getAvailableSlots, setBarberAvailability } from "./db";

describe("Day-off detection with correct day-of-week conversion", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should return __DAY_OFF__ marker when barber is marked as day off on Friday (dayOfWeek=4 in Monday-first system)", async () => {
    const barberId = 1;
    
    // Friday in JavaScript Date.getDay() is 5, but in Monday-first system it's 4
    // So we store isDayOff with dayOfWeek=4
    await setBarberAvailability(barberId, 4, "09:00", "18:00", 1);

    // Create a Friday date: June 5, 2026
    // JavaScript: new Date(2026, 5, 5).getDay() = 5 (Friday)
    // But getAvailableSlots converts it: 5 === 0 ? 6 : 5 - 1 = 4 (Monday-first Friday)
    const fridayDate = new Date(2026, 5, 5); // June 5, 2026 is a Friday
    
    const slots = await getAvailableSlots(fridayDate, barberId);
    
    // Should return the day-off marker
    expect(slots).toContain("__DAY_OFF__");
    expect(slots.length).toBe(1);
  });

  it("should return available time slots when barber is NOT marked as day off", async () => {
    const barberId = 1;
    
    // Set Monday (dayOfWeek=0) as working day
    await setBarberAvailability(barberId, 0, "09:00", "18:00", 0);

    // Create a Monday date: June 2, 2026
    const mondayDate = new Date(2026, 5, 2); // June 2, 2026 is a Monday
    
    const slots = await getAvailableSlots(mondayDate, barberId);
    
    // Should NOT contain day-off marker
    expect(slots).not.toContain("__DAY_OFF__");
    // Should be an array (possibly empty if no bookings)
    expect(Array.isArray(slots)).toBe(true);
  });

  it("should correctly distinguish between different days of the week", async () => {
    const barberId = 1;
    
    // Set Friday (dayOfWeek=4) as day off
    await setBarberAvailability(barberId, 4, "09:00", "18:00", 1);
    // Set Saturday (dayOfWeek=5) as working day
    await setBarberAvailability(barberId, 5, "09:00", "18:00", 0);

    // Test Friday - should be day off
    const fridayDate = new Date(2026, 5, 5); // June 5, 2026 is Friday
    const fridaySlots = await getAvailableSlots(fridayDate, barberId);
    expect(fridaySlots).toContain("__DAY_OFF__");

    // Test Saturday - should NOT be day off
    const saturdayDate = new Date(2026, 5, 6); // June 6, 2026 is Saturday
    const saturdaySlots = await getAvailableSlots(saturdayDate, barberId);
    expect(saturdaySlots).not.toContain("__DAY_OFF__");
  });

  afterAll(async () => {
    // Clean up test data - no need to clean up as test data is isolated
  });
});
