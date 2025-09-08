const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");

describe("Health Check", () => {
    it("GET / should return API running", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: "API running" });
    });
});
afterAll(async () => {
    await mongoose.connection.close(); // ✅ closes DB connectio
});
