import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { CreateCreatorRequest } from "../src/models/api";

const app = createApp();

function creators(count: number): CreateCreatorRequest[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `API Creator ${index + 1}`,
    email_address: `api-creator-${index + 1}@example.com`,
    phone_number: `555-020${index}`,
    course_type: "workshop"
  }));
}

describe("waiting list API", () => {
  it("creates a list, adds creators, takes oldest creators, and reports the count", async () => {
    await request(app).post("/api/waiting-list").send({ capacity: 10 }).expect(201);

    const addResponse = await request(app)
      .post("/api/waiting-list/creators")
      .send({ creators: creators(13) })
      .expect(200);

    expect(addResponse.body.added_creators).toHaveLength(13);
    expect(addResponse.body.waiting_list.cohorts.map((cohort: { creator_count: number }) => cohort.creator_count)).toEqual([
      3,
      10
    ]);

    const takeResponse = await request(app)
      .post("/api/waiting-list/take")
      .send({ count: 4, removal_reason: "onboarded" })
      .expect(200);

    expect(takeResponse.body.removed_count).toBe(4);
    expect(takeResponse.body.waiting_list.cohorts.map((cohort: { creator_count: number }) => cohort.creator_count)).toEqual([
      3,
      6
    ]);

    const countResponse = await request(app).get("/api/waiting-list/count").expect(200);
    expect(countResponse.body).toEqual({ total_creators_waiting: 9 });
  });

  it("returns the generated OpenAPI document", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);

    expect(response.body.openapi).toBe("3.0.0");
    expect(response.body.servers).toContainEqual({ url: "/api" });
    expect(response.body.paths["/waiting-list"]).toBeDefined();
  });

  it("returns runtime validation errors from tsoa", async () => {
    const response = await request(app).post("/api/waiting-list/take").send({}).expect(422);

    expect(response.body.message).toBe("Validation failed.");
    expect(response.body.details).toBeDefined();
  });

  it("returns domain validation errors from the service", async () => {
    const response = await request(app).post("/api/waiting-list").send({ capacity: 0 }).expect(400);

    expect(response.body.message).toBe("capacity must be a positive integer.");
  });
});
