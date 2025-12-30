const AIService = require("../services/aiService");

// Mock environment variable for testing
process.env.GEMINI_API_KEY = "test-key";

describe("AIService", () => {
  let aiService;

  beforeEach(async () => {
    aiService = new AIService();
    // Wait for knowledge base to load
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  describe("Knowledge Base Loading", () => {
    test("should load knowledge base on initialization", () => {
      expect(aiService.knowledgeBase.size).toBeGreaterThan(0);
    });
  });

  describe("findRelevantKnowledge", () => {
    test("should find relevant content for pricing queries", () => {
      const relevantContent = aiService.findRelevantKnowledge(
        "What are your prices?"
      );
      expect(relevantContent.length).toBeGreaterThan(0);
      expect(
        relevantContent.some(
          (content) =>
            content.toLowerCase().includes("pricing") || content.includes("£")
        )
      ).toBe(true);
    });

    test("should find relevant content for service queries", () => {
      const relevantContent = aiService.findRelevantKnowledge(
        "What services do you offer?"
      );
      expect(relevantContent.length).toBeGreaterThan(0);
      expect(
        relevantContent.some(
          (content) =>
            content.toLowerCase().includes("services") ||
            content.toLowerCase().includes("development")
        )
      ).toBe(true);
    });

    test("should return general company info for unspecific queries", () => {
      const relevantContent = aiService.findRelevantKnowledge(
        "Tell me about your company"
      );
      expect(relevantContent.length).toBeGreaterThan(0);
    });
  });

  describe("isBookingIntent", () => {
    test("should detect booking intent with direct keywords", async () => {
      const isBooking = await aiService.isBookingIntent(
        "I want to book a consultation"
      );
      expect(isBooking).toBe(true);
    });

    test("should detect booking intent with project keywords", async () => {
      const isBooking = await aiService.isBookingIntent(
        "I need help with a project"
      );
      expect(isBooking).toBe(true);
    });

    test("should handle API failures gracefully", async () => {
      const isBooking = await aiService.isBookingIntent(
        "What services do you offer?"
      );
      // Should return boolean even if API fails (fallback to keyword detection)
      expect(typeof isBooking).toBe("boolean");
    });
  });

  describe("extractBookingInfo", () => {
    test("should return object structure", async () => {
      const info = await aiService.extractBookingInfo(
        "My name is John Smith",
        {}
      );
      expect(typeof info).toBe("object");
    });

    test("should merge with existing info", async () => {
      const currentInfo = { name: "John" };
      const info = await aiService.extractBookingInfo(
        "My email is john@example.com",
        currentInfo
      );
      expect(info.name).toBe("John");
      expect(typeof info).toBe("object");
    });
  });

  describe("Fallback Responses", () => {
    test("should return fallback response", () => {
      const response = aiService.getFallbackResponse();
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toContain("metalogics");
    });

    test("should return booking fallback response", () => {
      const response = aiService.getBookingFallbackResponse();
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toContain("consultation");
    });

    test("should handle service failure gracefully", async () => {
      const response = await aiService.handleServiceFailure(
        "I want to book a meeting"
      );
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe("Context Management", () => {
    test("should manage conversation context", () => {
      const sessionId = "test-session";

      // Initially empty
      expect(aiService.getContext(sessionId)).toEqual([]);

      // Clear context
      aiService.clearContext(sessionId);
      expect(aiService.getContext(sessionId)).toEqual([]);
    });
  });
});
