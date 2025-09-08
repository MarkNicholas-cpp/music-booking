const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

const uniqueEmail = () => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;

describe("Auth", () => {
    afterAll(async () => {
        await mongoose.connection.close();
    });

    it("POST /api/auth/register should create user and return token", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ name: "Test User", email: uniqueEmail(), password: "secret123" });
        expect([200, 201]).toContain(res.statusCode);
        expect(res.body).toHaveProperty("token");
        expect(typeof res.body.token).toBe("string");
    });

    it("POST /api/auth/register should fail on duplicate email", async () => {
        const email = uniqueEmail();
        const first = await request(app)
            .post("/api/auth/register")
            .send({ name: "First User", email, password: "secret123" });
        expect([200, 201]).toContain(first.statusCode);

        const dup = await request(app)
            .post("/api/auth/register")
            .send({ name: "Another User", email, password: "secret123" });
        expect(dup.statusCode).toBe(409);
        expect(dup.body).toHaveProperty("message");
    });

    it("POST /api/auth/register should validate inputs", async () => {
        const bads = [
            { name: "A", email: "not-an-email", password: "123" },
            { name: "", email: uniqueEmail(), password: "secret123" },
            { name: "Valid Name", email: "", password: "secret123" },
            { name: "Valid Name", email: uniqueEmail(), password: "123" },
        ];
        for (const body of bads) {
            const res = await request(app).post("/api/auth/register").send(body);
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty("message");
        }
    });

    it("POST /api/auth/login should return token for valid credentials", async () => {
        const email = uniqueEmail();
        const password = "secret123";
        const reg = await request(app).post("/api/auth/register").send({ name: "Login User", email, password });
        expect([200, 201]).toContain(reg.statusCode);

        const res = await request(app).post("/api/auth/login").send({ email, password });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("token");
    });

    it("POST /api/auth/login should fail for unknown user", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: uniqueEmail(), password: "secret123" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("message");
    });

    it("POST /api/auth/login should fail for wrong password", async () => {
        const email = uniqueEmail();
        await request(app).post("/api/auth/register").send({ name: "Pw User", email, password: "secret123" });
        const res = await request(app).post("/api/auth/login").send({ email, password: "wrongpass" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("message");
    });

    it("POST /api/auth/login should validate inputs", async () => {
        const bads = [
            { email: "not-an-email", password: "secret123" },
            { email: "", password: "secret123" },
            { email: uniqueEmail(), password: "123" },
            {},
        ];
        for (const body of bads) {
            const res = await request(app).post("/api/auth/login").send(body);
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty("message");
        }
    });
});


