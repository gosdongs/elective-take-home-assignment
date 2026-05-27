import request from "supertest";
import {describe, expect, it} from "vitest";
import {createApp} from "../src/app";
import type {CreateCreatorRequest} from "../src/models/api";

const app = createApp();

function creators(count: number): CreateCreatorRequest[] {
    return Array.from({length: count}, (_, index) => ({
        name: `API Creator ${index + 1}`,
        email_address: `api-creator-${index + 1}@example.com`,
        phone_number: `555-020${index}`,
        course_type: "workshop"
    }));
}

describe("waiting list API", () => {
    it("creates a list, adds creators, takes oldest creators, and reports the count", async () => {
        await request(app).post("/api/waiting-list").send({capacity: 10}).expect(201);

        const addResponse = await request(app)
            .post("/api/waiting-list/creators")
            .send({creators: creators(13)})
            .expect(200);

        expect(addResponse.body.added_creators).toHaveLength(13);
        expect(addResponse.body.waiting_list.cohorts.map((cohort: {
            creator_count: number
        }) => cohort.creator_count)).toEqual([
            3,
            10
        ]);
        expect(addResponse.body.waiting_list.cohorts[0].creators).toEqual([
            expect.objectContaining({
                name: "API Creator 11",
                email_address: "api-creator-11@example.com",
                phone_number: "555-02010",
                course_type: "workshop"
            }),
            expect.objectContaining({
                name: "API Creator 12",
                email_address: "api-creator-12@example.com",
                phone_number: "555-02011",
                course_type: "workshop"
            }),
            expect.objectContaining({
                name: "API Creator 13",
                email_address: "api-creator-13@example.com",
                phone_number: "555-02012",
                course_type: "workshop"
            })
        ]);

        const takeResponse = await request(app)
            .post("/api/waiting-list/take")
            .send({count: 4, removal_reason: "onboarded"})
            .expect(200);

        expect(takeResponse.body.removed_count).toBe(4);
        expect(takeResponse.body.waiting_list.cohorts.map((cohort: {
            creator_count: number
        }) => cohort.creator_count)).toEqual([
            3,
            6
        ]);
        expect(takeResponse.body.waiting_list.cohorts[1].creators[0]).toEqual(
            expect.objectContaining({name: "API Creator 5"})
        );

        const countResponse = await request(app).get("/api/waiting-list/count").expect(200);
        expect(countResponse.body).toEqual({total_creators_waiting: 9});
    });

    it("returns the generated OpenAPI document", async () => {
        const response = await request(app).get("/api/openapi.json").expect(200);

        expect(response.body.openapi).toBe("3.0.0");
        expect(response.body.servers).toContainEqual({url: "/api"});
        expect(response.body.paths["/waiting-list"]).toBeDefined();
    });

    it("removes a specific active creator with a supplied reason", async () => {
        await request(app).post("/api/waiting-list").send({capacity: 2}).expect(201);
        await request(app).post("/api/waiting-list/creators").send({creators: creators(3)}).expect(200);

        const removeResponse = await request(app)
            .post("/api/waiting-list/creators/creator_1/remove")
            .send({removal_reason: "duplicate application"})
            .expect(200);

        expect(removeResponse.body.removed_creator).toEqual(
            expect.objectContaining({
                name: "API Creator 1",
                email_address: "api-creator-1@example.com"
            })
        );
        expect(removeResponse.body.removed_creator.creator_cohort.removal_reason).toBe("duplicate application");
        expect(removeResponse.body.waiting_list.total_creators_waiting).toBe(2);
        expect(removeResponse.body.waiting_list.cohorts.map((cohort: {
            creator_count: number
        }) => cohort.creator_count)).toEqual([
            1,
            1
        ]);
        expect(removeResponse.body.waiting_list.cohorts[1].creators.map((creator: {
            name: string
        }) => creator.name)).toEqual([
            "API Creator 2"
        ]);
    });

    it("rejects direct removal without a reason", async () => {
        await request(app).post("/api/waiting-list").send({capacity: 10}).expect(201);
        await request(app).post("/api/waiting-list/creators").send({creators: creators(1)}).expect(200);

        const response = await request(app)
            .post("/api/waiting-list/creators/creator_1/remove")
            .send({removal_reason: " "})
            .expect(400);

        expect(response.body.message).toBe("removal_reason is required.");
    });

    it("returns runtime validation errors from tsoa", async () => {
        const response = await request(app).post("/api/waiting-list/take").send({}).expect(422);

        expect(response.body.message).toBe("Validation failed.");
        expect(response.body.details).toBeDefined();
    });

    it("returns a 400 for malformed JSON bodies", async () => {
        const response = await request(app)
            .post("/api/waiting-list/take")
            .set("Content-Type", "application/json")
            .send("{")
            .expect(400);

        expect(response.body.message).toBe("Malformed JSON request body.");
    });

    it("returns domain validation errors from the service", async () => {
        const response = await request(app).post("/api/waiting-list").send({capacity: 0}).expect(400);

        expect(response.body.message).toBe("capacity must be a positive integer.");
    });
});
