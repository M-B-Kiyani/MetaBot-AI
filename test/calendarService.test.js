const CalendarService = require("../services/calendarService");

describe("CalendarService", () => {
  let calendarService;

  beforeEach(() => {
    calendarService = new CalendarService();
  });

  describe("generateEventDescription", () => {
    it("should generate proper event description with user information", () => {
      const eventData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Test Company",
        inquiry: "Need help with website development",
        duration: 30,
      };

      const description = calendarService.generateEventDescription(eventData);

      expect(description).toContain("John Doe");
      expect(description).toContain("john@example.com");
      expect(description).toContain("Test Company");
      expect(description).toContain("Need help with website development");
      expect(description).toContain("30 minutes");
      expect(description).toContain("Metalogics.io");
      expect(description).toContain("hello@metalogics.io");
    });

    it("should handle special characters in user information", () => {
      const eventData = {
        name: "José María",
        email: "jose@company.co.uk",
        company: "Company & Associates",
        inquiry: 'E-commerce site with "special" features',
        duration: 45,
      };

      const description = calendarService.generateEventDescription(eventData);

      expect(description).toContain("José María");
      expect(description).toContain("Company & Associates");
      expect(description).toContain('E-commerce site with "special" features');
    });
  });

  describe("createEvent", () => {
    it("should return error when calendar service not initialized", async () => {
      const eventData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Test Company",
        inquiry: "Website development",
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration: 30,
      };

      const result = await calendarService.createEvent(eventData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Calendar service not initialized");
      expect(result.eventId).toBeNull();
      expect(result.event).toBeNull();
      expect(result.meetingLink).toBeNull();
    });

    it("should validate required fields", async () => {
      const eventData = {
        name: "John Doe",
        email: "john@example.com",
        // Missing company, inquiry, dateTime, duration
      };

      const result = await calendarService.createEvent(eventData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required field");
    });

    it("should reject events in the past", async () => {
      const eventData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Test Company",
        inquiry: "Website development",
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        duration: 30,
      };

      const result = await calendarService.createEvent(eventData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot create event in the past");
    });
  });

  describe("checkAvailability", () => {
    it("should return available=true when calendar service not initialized (graceful degradation)", async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const result = await calendarService.checkAvailability(
        startTime,
        endTime
      );

      expect(result.available).toBe(true);
      expect(result.conflicts).toEqual([]);
      expect(result.error).toContain("Calendar service not initialized");
    });
  });

  describe("listAvailableSlots", () => {
    it("should return empty array for weekends", async () => {
      // Create a Saturday date
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));

      const slots = await calendarService.listAvailableSlots(saturday, 30);

      expect(slots).toEqual([]);
    });

    it("should return empty array on error (graceful degradation)", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const slots = await calendarService.listAvailableSlots(tomorrow, 30);

      expect(Array.isArray(slots)).toBe(true);
      // Should return empty array due to calendar service not being initialized
      expect(slots).toEqual([]);
    });
  });

  describe("getHealthStatus", () => {
    it("should return unhealthy when calendar service not initialized", async () => {
      const status = await calendarService.getHealthStatus();

      expect(status.healthy).toBe(false);
      expect(status.error).toContain("Calendar service not initialized");
    });
  });

  describe("updateEvent", () => {
    it("should return error when calendar service not initialized", async () => {
      const result = await calendarService.updateEvent("test-event-id", {
        summary: "Updated Meeting",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Calendar service not initialized");
    });
  });

  describe("deleteEvent", () => {
    it("should return error when calendar service not initialized", async () => {
      const result = await calendarService.deleteEvent("test-event-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Calendar service not initialized");
    });
  });
});
