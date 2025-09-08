const request = require("supertest");
const mongoose = require("mongoose");
jest.mock('../utils/email', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
const { sendEmail } = require('../utils/email');
const app = require("../server");

const registerAndLogin = async (role = 'user') => {
    const email = `admin_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
    const password = "secret123";
    const name = role === 'admin' ? 'Admin' : 'User';
    const reg = await request(app).post("/api/auth/register").send({ name, email, password });
    const { token } = reg.body;
    // If admin needed, directly update in DB since no endpoint to elevate
    if (role === 'admin') {
        const User = require('../models/User');
        const user = await User.findOne({ email });
        user.role = 'admin';
        await user.save();
        // login again to get token containing updated role
        const login = await request(app).post('/api/auth/login').send({ email, password });
        return { token: login.body.token };
    }
    return { token };
};

describe("Admin RBAC", () => {
    let adminToken;
    let userToken;

    beforeAll(async () => {
        const admin = await registerAndLogin('admin');
        adminToken = admin.token;
        const user = await registerAndLogin('user');
        userToken = user.token;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it("GET /api/admin/bookings should list all bookings for admin", async () => {
        // create a few bookings as normal user
        const make = async (name) => request(app).post("/api/bookings").set({ Authorization: `Bearer ${userToken}` }).send({
            functionName: name,
            startDate: new Date(Date.now() + 3600_000).toISOString(),
            endDate: new Date(Date.now() + 7200_000).toISOString(),
            venue: "Hall"
        });
        await make("B1");
        await make("B2");

        const res = await request(app).get('/api/admin/bookings').set({ Authorization: `Bearer ${adminToken}` });
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("PATCH /api/admin/bookings/:id should allow admin to change status", async () => {
        const create = await request(app).post('/api/bookings').set({ Authorization: `Bearer ${userToken}` }).send({
            functionName: 'To Approve',
            startDate: new Date(Date.now() + 3600_000).toISOString(),
            endDate: new Date(Date.now() + 7200_000).toISOString(),
            venue: 'Main'
        });
        const id = create.body._id;

        const res = await request(app)
            .patch(`/api/admin/bookings/${id}`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ status: 'confirmed' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'confirmed');
        expect(sendEmail).toHaveBeenCalledTimes(1);
        const call = sendEmail.mock.calls[0][0];
        expect(call).toHaveProperty('to');
        expect(call).toHaveProperty('subject', 'Booking Confirmed');
        expect(call).toHaveProperty('html');
    });

    it("non-admin should receive 403 on admin endpoints", async () => {
        const res1 = await request(app).get('/api/admin/bookings').set({ Authorization: `Bearer ${userToken}` });
        expect(res1.statusCode).toBe(403);

        const dummyId = new mongoose.Types.ObjectId().toString();
        const res2 = await request(app).patch(`/api/admin/bookings/${dummyId}`).set({ Authorization: `Bearer ${userToken}` }).send({ status: 'confirmed' });
        expect(res2.statusCode).toBe(403);
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not send email on invalid status", async () => {
        const create = await request(app).post('/api/bookings').set({ Authorization: `Bearer ${userToken}` }).send({
            functionName: 'Invalid Status',
            startDate: new Date(Date.now() + 3600_000).toISOString(),
            endDate: new Date(Date.now() + 7200_000).toISOString(),
            venue: 'Main'
        });
        const id = create.body._id;
        const res = await request(app)
            .patch(`/api/admin/bookings/${id}`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ status: 'whatever' });
        expect(res.statusCode).toBe(400);
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not send email on invalid id format", async () => {
        const res = await request(app)
            .patch(`/api/admin/bookings/invalid-id`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ status: 'confirmed' });
        expect(res.statusCode).toBe(400);
        expect(sendEmail).not.toHaveBeenCalled();
    });
});


