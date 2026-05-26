import { describe, expect, it } from "vitest";
import { WaitingListService } from "../src/services/WaitingListService";
import type { CreateCreatorRequest } from "../src/models/api";

function creators(count: number): CreateCreatorRequest[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Creator ${index + 1}`,
    email_address: `creator${index + 1}@example.com`,
    phone_number: `555-010${index}`,
    course_type: "cohort-based"
  }));
}

function cohortCounts(service: WaitingListService): number[] {
  return service.getWaitingList().cohorts.map((cohort) => cohort.creator_count);
}

describe("WaitingListService", () => {
  it("matches the required FIFO example flow", () => {
    const service = new WaitingListService();

    expect(cohortCounts(service)).toEqual([]);

    service.addCreators(creators(3));
    expect(cohortCounts(service)).toEqual([3]);

    service.addCreators(creators(13));
    expect(cohortCounts(service)).toEqual([6, 10]);

    service.addCreators(creators(22));
    expect(cohortCounts(service)).toEqual([8, 10, 10, 10]);

    service.takeCreators(4);
    expect(cohortCounts(service)).toEqual([8, 10, 10, 6]);

    service.takeCreators(7);
    expect(cohortCounts(service)).toEqual([8, 10, 9]);
    expect(service.getCount()).toEqual({ total_creators_waiting: 27 });

    service.takeCreators(20);
    expect(cohortCounts(service)).toEqual([7]);
    expect(service.getCount()).toEqual({ total_creators_waiting: 7 });
  });

  it("supports a custom capacity and removes more than one oldest cohort", () => {
    const service = new WaitingListService();
    service.createWaitingList(3);

    service.addCreators(creators(7));
    expect(cohortCounts(service)).toEqual([1, 3, 3]);

    const response = service.takeCreators(5);

    expect(response.removed_count).toBe(5);
    expect(cohortCounts(service)).toEqual([1, 1]);
    expect(service.getCount().total_creators_waiting).toBe(2);
  });

  it("takes no more than the available creators", () => {
    const service = new WaitingListService();
    service.addCreators(creators(4));

    const response = service.takeCreators(20);

    expect(response.removed_count).toBe(4);
    expect(cohortCounts(service)).toEqual([]);
    expect(service.getCount().total_creators_waiting).toBe(0);
  });

  it("keeps removal history on creator_cohort records", () => {
    const service = new WaitingListService();
    service.addCreators(creators(2));

    const response = service.takeCreators(1, "manual review");
    const memberships = service.getCreatorCohorts();
    const removedMemberships = memberships.filter((membership) => membership.removed_at);

    expect(response.removed_count).toBe(1);
    expect(removedMemberships).toHaveLength(1);
    expect(removedMemberships[0].removal_reason).toBe("manual review");
  });

  it("handles zero-count take requests as a no-op", () => {
    const service = new WaitingListService();
    service.addCreators(creators(2));

    const response = service.takeCreators(0);

    expect(response.removed_count).toBe(0);
    expect(cohortCounts(service)).toEqual([2]);
  });

  it("rejects invalid capacity and take counts", () => {
    const service = new WaitingListService();

    expect(() => service.createWaitingList(0)).toThrow("capacity must be a positive integer.");
    expect(() => service.createWaitingList(1.5)).toThrow("capacity must be a positive integer.");
    expect(() => service.takeCreators(-1)).toThrow("count must be a non-negative integer.");
  });

  it("validates required creator fields", () => {
    const service = new WaitingListService();

    expect(() =>
      service.addCreators([
        {
          name: " ",
          email_address: "creator@example.com",
          phone_number: "555-0101",
          course_type: "cohort-based"
        }
      ])
    ).toThrow("name is required.");
  });
});
