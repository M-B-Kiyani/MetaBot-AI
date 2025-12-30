const request = require("supertest");
const app = require("../app");

describe("Basic App Functionality", () => {
  describe("Health Endpoints", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("environment");
    });

    it("should return API status", async () => {
      const response = await request(app).get("/api/status").expect(200);

      expect(response.body).toHaveProperty("service", "AI Booking Assistant");
      expect(response.body).toHaveProperty("version", "1.0.0");
      expect(response.body).toHaveProperty("status", "operational");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown endpoints", async () => {
      const response = await request(app).get("/unknown-endpoint").expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error).toHaveProperty("code", "NOT_FOUND");
      expect(response.body.error).toHaveProperty(
        "message",
        "Endpoint not found"
      );
    });
  });

  describe("Security Middleware", () => {
    it("should include security headers", async () => {
      const response = await request(app).get("/health").expect(200);

      // Check for helmet security headers
      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers).toHaveProperty("x-frame-options");
    });

    it("should handle CORS properly", async () => {
      const response = await request(app)
        .options("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });
  });
});
