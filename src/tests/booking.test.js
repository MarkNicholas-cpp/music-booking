const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

const registerAndLogin = async () => {
    const email = `booker_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
    const password = "secret123";
    const name = "Booker";
    const reg = await request(app).post("/api/auth/register").send({ name, email, password });
    const token = reg.body.token;
    return { token, email };
};

describe("Bookings", () => {
    let authHeader;
    let userToken;

    beforeAll(async () => {
        const { token } = await registerAndLogin();
        userToken = token;
        authHeader = { Authorization: `Bearer ${token}` };
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it("POST /api/bookings should create booking with valid payload and auth", async () => {
        const body = {
            functionName: "Live Concert",
            startDate: new Date(Date.now() + 3600_000).toISOString(),
            endDate: new Date(Date.now() + 7200_000).toISOString(),
            venue: "Downtown Arena"
        };
        const res = await request(app).post("/api/bookings").set(authHeader).send(body);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("_id");
        expect(res.body).toHaveProperty("functionName", body.functionName);
    });

    it("POST /api/bookings should reject missing/invalid fields", async () => {
        const cases = [
            {},
            { functionName: "", startDate: new Date().toISOString(), endDate: new Date().toISOString(), venue: "A" },
            { functionName: "Show", startDate: "bad-date", endDate: new Date().toISOString(), venue: "Hall" },
            { functionName: "Show", startDate: new Date().toISOString(), endDate: "bad-date", venue: "Hall" },
            { functionName: "Show", startDate: new Date().toISOString(), venue: "" },
        ];
        for (const body of cases) {
            const res = await request(app).post("/api/bookings").set(authHeader).send(body);
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty("message");
        }
    });

    it("POST /api/bookings should require auth", async () => {
        const body = {
            functionName: "Unauthorized Concert",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 3600_000).toISOString(),
            venue: "No Access Hall"
        };
        const res = await request(app).post("/api/bookings").send(body);
        expect(res.statusCode).toBe(401);
    });

    it("GET /api/bookings should list only my bookings", async () => {
        // Create two bookings
        const make = async (name) => request(app).post("/api/bookings").set(authHeader).send({
            functionName: name,
            startDate: new Date(Date.now() + 3600_000).toISOString(),
            endDate: new Date(Date.now() + 7200_000).toISOString(),
            venue: "Main Hall"
        });
        await make("Event One");
        await make("Event Two");

        const res = await request(app).get("/api/bookings").set(authHeader);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        for (const b of res.body) {
            expect(b).toHaveProperty("user");
            expect(b).toHaveProperty("functionName");
        }
    });

    it("GET /api/bookings should require auth", async () => {
        const res = await request(app).get("/api/bookings");
        expect(res.statusCode).toBe(401);
    });

    describe("PUT /api/bookings/:id (update)", () => {
        const makeBooking = async (token, overrides = {}) => {
            const body = {
                functionName: overrides.functionName || "Show",
                startDate: overrides.startDate || new Date(Date.now() + 3600_000).toISOString(),
                endDate: overrides.endDate || new Date(Date.now() + 7200_000).toISOString(),
                venue: overrides.venue || "Main Hall"
            };
            const res = await request(app).post("/api/bookings").set({ Authorization: `Bearer ${token}` }).send(body);
            return res.body;
        };

        it("should allow user to update their booking", async () => {
            const created = await makeBooking(userToken, { functionName: "Event Updatable" });
            const updateBody = { venue: "Updated Venue" };
            const res = await request(app)
                .put(`/api/bookings/${created._id}`)
                .set({ Authorization: `Bearer ${userToken}` })
                .send(updateBody);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("_id", created._id);
            expect(res.body).toHaveProperty("venue", updateBody.venue);
        });

        it("should return 403 when updating another user's booking", async () => {
            // create with user A
            const created = await makeBooking(userToken, { functionName: "Event Forbidden" });
            // login as user B
            const { token: otherToken } = await registerAndLogin();
            const res = await request(app)
                .put(`/api/bookings/${created._id}`)
                .set({ Authorization: `Bearer ${otherToken}` })
                .send({ venue: "Hacker Venue" });
            expect(res.statusCode).toBe(403);
            expect(res.body).toHaveProperty("message");
        });

        it("should return 400 for invalid fields (endDate before startDate)", async () => {
            const created = await makeBooking(userToken, { functionName: "Event Invalid Dates" });
            const start = new Date(Date.now() + 7200_000).toISOString();
            const end = new Date(Date.now() + 3600_000).toISOString();
            const res = await request(app)
                .put(`/api/bookings/${created._id}`)
                .set({ Authorization: `Bearer ${userToken}` })
                .send({ startDate: start, endDate: end });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty("message");
        });

        it("should return 404 when booking not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .put(`/api/bookings/${nonExistentId}`)
                .set({ Authorization: `Bearer ${userToken}` })
                .send({ venue: "Nope" });
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty("message");
        });

        it("should return 401 when no auth token provided", async () => {
            const created = await makeBooking(userToken);
            const res = await request(app)
                .put(`/api/bookings/${created._id}`)
                .send({ venue: "No Auth" });
            expect(res.statusCode).toBe(401);
        });
    });

    describe("DELETE /api/bookings/:id (delete)", () => {
        const makeBooking = async (token, overrides = {}) => {
            const body = {
                functionName: overrides.functionName || "To Delete",
                startDate: overrides.startDate || new Date(Date.now() + 3600_000).toISOString(),
                endDate: overrides.endDate || new Date(Date.now() + 7200_000).toISOString(),
                venue: overrides.venue || "Hall"
            };
            const res = await request(app).post("/api/bookings").set({ Authorization: `Bearer ${token}` }).send(body);
            return res.body;
        };

        it("should allow user to delete their booking", async () => {
            const created = await makeBooking(userToken);
            const res = await request(app)
                .delete(`/api/bookings/${created._id}`)
                .set({ Authorization: `Bearer ${userToken}` });
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("message");
        });

        it("should return 403 when deleting another user's booking", async () => {
            const created = await makeBooking(userToken);
            const { token: otherToken } = await registerAndLogin();
            const res = await request(app)
                .delete(`/api/bookings/${created._id}`)
                .set({ Authorization: `Bearer ${otherToken}` });
            expect(res.statusCode).toBe(403);
            expect(res.body).toHaveProperty("message");
        });

        it("should return 404 when booking not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .delete(`/api/bookings/${nonExistentId}`)
                .set({ Authorization: `Bearer ${userToken}` });
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty("message");
        });

        it("should return 401 when no auth token provided", async () => {
            const created = await makeBooking(userToken);
            const res = await request(app)
                .delete(`/api/bookings/${created._id}`);
            expect(res.statusCode).toBe(401);
        });
    });
});


