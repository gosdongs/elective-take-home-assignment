import {describe, expect, it} from "vitest";
import {WaitingListService} from "../src/services/WaitingListService";
import type {CreateCreatorRequest} from "../src/models/api";

function creators(count: number): CreateCreatorRequest[] {
    return Array.from({length: count}, (_, index) => ({
        name: `Creator ${index + 1}`,
        email_address: `creator${index + 1}@example.com`,
        phone_number: `555-010${index}`,
        course_type: "cohort-based"
    }));
}

function namedCreators(names: string[]): CreateCreatorRequest[] {
    return names.map((name, index) => ({
        name,
        email_address: `${name.toLowerCase().replaceAll(" ", "-")}@example.com`,
        phone_number: `555-030${index}`,
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
        expect(service.getCount()).toEqual({total_creators_waiting: 27});

        service.takeCreators(20);
        expect(cohortCounts(service)).toEqual([7]);
        expect(service.getCount()).toEqual({total_creators_waiting: 7});
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

    it("adds creators to the oldest partial cohort before newer cohorts", () => {
        const service = new WaitingListService();
        service.createWaitingList(10);

        service.addCreators(creators(38));
        service.takeCreators(11);
        expect(cohortCounts(service)).toEqual([8, 10, 9]);

        service.addCreators(namedCreators(["New Creator A", "New Creator B", "New Creator C"]));

        expect(cohortCounts(service)).toEqual([10, 10, 10]);
        expect(service.getWaitingList().cohorts[2].creators.at(-1)?.name).toBe("New Creator A");
        expect(service.getWaitingList().cohorts[0].creators.slice(-2).map((creator) => creator.name)).toEqual([
            "New Creator B",
            "New Creator C"
        ]);
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

    it("includes active creator details in cohort summaries", () => {
        const service = new WaitingListService();
        service.createWaitingList(2);

        service.addCreators(creators(3));
        const waitingList = service.getWaitingList();

        expect(waitingList.cohorts[0].creator_count).toBe(1);
        expect(waitingList.cohorts[0].creators).toEqual([
            expect.objectContaining({
                name: "Creator 3",
                email_address: "creator3@example.com",
                phone_number: "555-0102",
                course_type: "cohort-based"
            })
        ]);
        expect(waitingList.cohorts[1].creator_count).toBe(2);
        expect(waitingList.cohorts[1].creators.map((creator) => creator.name)).toEqual(["Creator 1", "Creator 2"]);

        service.takeCreators(1);

        expect(service.getWaitingList().cohorts[1].creators.map((creator) => creator.name)).toEqual(["Creator 2"]);
    });

    it("removes a specific active creator with a supplied reason", () => {
        const service = new WaitingListService();
        service.createWaitingList(2);
        service.addCreators(creators(3));

        const response = service.removeCreator("creator_1", "duplicate application");

        expect(response.removed_creator.name).toBe("Creator 1");
        expect(response.removed_creator.creator_cohort.removal_reason).toBe("duplicate application");
        expect(response.waiting_list.total_creators_waiting).toBe(2);
        expect(cohortCounts(service)).toEqual([1, 1]);
        expect(service.getWaitingList().cohorts[1].creators.map((creator) => creator.name)).toEqual(["Creator 2"]);
    });

    it("removes an empty cohort after the last active creator is removed directly", () => {
        const service = new WaitingListService();
        service.createWaitingList(2);
        service.addCreators(creators(3));

        service.removeCreator("creator_3", "not a fit");

        expect(cohortCounts(service)).toEqual([2]);
        expect(service.getWaitingList().cohorts[0].creators.map((creator) => creator.name)).toEqual([
            "Creator 1",
            "Creator 2"
        ]);
    });

    it("requires a reason and an active creator for direct removal", () => {
        const service = new WaitingListService();
        service.addCreators(creators(1));

        expect(() => service.removeCreator("creator_1", " ")).toThrow("removal_reason is required.");

        service.removeCreator("creator_1", "duplicate application");

        expect(() => service.removeCreator("creator_1", "duplicate application")).toThrow(
            "Creator creator_1 is not active in a cohort."
        );
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
