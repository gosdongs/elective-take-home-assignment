import type {
  AddCreatorsResponse,
  CohortSummary,
  CountResponse,
  CreateCreatorRequest,
  RemovedCreator,
  TakeCreatorsResponse,
  WaitingListResponse
} from "../models/api";
import type { Cohort, Creator, CreatorCohort } from "../models/domain";
import { DomainError } from "./DomainError";

const DEFAULT_CAPACITY = 10;
const DEFAULT_REMOVAL_REASON = "onboarded";

export class WaitingListService {
  private capacity = DEFAULT_CAPACITY;
  private creators = new Map<string, Creator>();
  private cohorts = new Map<string, Cohort>();
  private creatorCohorts = new Map<string, CreatorCohort>();
  private cohortOrder: string[] = [];
  private creatorSequence = 1;
  private cohortSequence = 1;
  private creatorCohortSequence = 1;

  public constructor() {
    this.createWaitingList();
  }

  public createWaitingList(capacity = DEFAULT_CAPACITY): WaitingListResponse {
    this.assertPositiveInteger(capacity, "capacity");

    this.capacity = capacity;
    this.creators = new Map();
    this.cohorts = new Map();
    this.creatorCohorts = new Map();
    this.cohortOrder = [];
    this.creatorSequence = 1;
    this.cohortSequence = 1;
    this.creatorCohortSequence = 1;

    return this.getWaitingList();
  }

  public addCreators(requests: CreateCreatorRequest[]): AddCreatorsResponse {
    if (!Array.isArray(requests)) {
      throw new DomainError("creators must be an array.");
    }

    const addedCreators: Creator[] = [];

    for (const request of requests) {
      this.assertValidCreatorRequest(request);

      const creator = this.createCreator(request);
      const cohort = this.findNewestCohortWithSpace() ?? this.createCohort();

      this.creators.set(creator.id, creator);
      this.addCreatorToCohort(creator.id, cohort.id);
      addedCreators.push(creator);
    }

    return {
      added_creators: addedCreators,
      waiting_list: this.getWaitingList()
    };
  }

  public takeCreators(count: number, removalReason = DEFAULT_REMOVAL_REASON): TakeCreatorsResponse {
    this.assertNonNegativeInteger(count, "count");

    const removedCreators: RemovedCreator[] = [];
    let remainingToRemove = Math.min(count, this.getTotalCreatorsWaiting());
    const reason = this.normalizeRemovalReason(removalReason);

    while (remainingToRemove > 0 && this.cohortOrder.length > 0) {
      const oldestCohortId = this.cohortOrder[this.cohortOrder.length - 1];
      const activeMemberships = this.getActiveMembershipsForCohort(oldestCohortId);
      const removeCount = Math.min(remainingToRemove, activeMemberships.length);
      const removedAt = new Date().toISOString();

      for (const membership of activeMemberships.slice(0, removeCount)) {
        membership.removed_at = removedAt;
        membership.removal_reason = reason;

        const creator = this.creators.get(membership.creator_id);
        if (creator) {
          removedCreators.push({
            ...creator,
            creator_cohort: { ...membership }
          });
        }
      }

      remainingToRemove -= removeCount;

      if (this.getActiveMembershipsForCohort(oldestCohortId).length === 0) {
        this.cohortOrder.pop();
      }
    }

    return {
      removed_count: removedCreators.length,
      removed_creators: removedCreators,
      waiting_list: this.getWaitingList()
    };
  }

  public getWaitingList(): WaitingListResponse {
    const cohorts = this.cohortOrder.map((cohortId) => this.toCohortSummary(cohortId));

    return {
      capacity: this.capacity,
      total_creators_waiting: this.getTotalCreatorsWaiting(),
      cohorts
    };
  }

  public getCount(): CountResponse {
    return {
      total_creators_waiting: this.getTotalCreatorsWaiting()
    };
  }

  public getCreatorCohorts(): CreatorCohort[] {
    return Array.from(this.creatorCohorts.values()).map((membership) => ({ ...membership }));
  }

  private createCreator(request: CreateCreatorRequest): Creator {
    return {
      id: `creator_${this.creatorSequence++}`,
      name: request.name.trim(),
      email_address: request.email_address.trim(),
      phone_number: request.phone_number.trim(),
      course_type: request.course_type.trim(),
      created_at: new Date().toISOString()
    };
  }

  private createCohort(): Cohort {
    const cohort: Cohort = {
      id: `cohort_${this.cohortSequence}`,
      name: `Cohort ${this.cohortSequence}`,
      capacity: this.capacity,
      created_at: new Date().toISOString()
    };

    this.cohortSequence += 1;
    this.cohorts.set(cohort.id, cohort);
    this.cohortOrder.unshift(cohort.id);

    return cohort;
  }

  private addCreatorToCohort(creatorId: string, cohortId: string): void {
    const createdAt = new Date().toISOString();
    const creatorCohort: CreatorCohort = {
      id: `creator_cohort_${this.creatorCohortSequence++}`,
      creator_id: creatorId,
      cohort_id: cohortId,
      added_at: createdAt,
      created_at: createdAt
    };

    this.creatorCohorts.set(creatorCohort.id, creatorCohort);
  }

  private findNewestCohortWithSpace(): Cohort | undefined {
    const newestCohortId = this.cohortOrder[0];
    if (!newestCohortId) {
      return undefined;
    }

    const cohort = this.cohorts.get(newestCohortId);
    if (!cohort) {
      return undefined;
    }

    return this.getActiveMembershipsForCohort(cohort.id).length < cohort.capacity ? cohort : undefined;
  }

  private getTotalCreatorsWaiting(): number {
    return Array.from(this.creatorCohorts.values()).filter((membership) => !membership.removed_at).length;
  }

  private getActiveMembershipsForCohort(cohortId: string): CreatorCohort[] {
    return Array.from(this.creatorCohorts.values()).filter(
      (membership) => membership.cohort_id === cohortId && !membership.removed_at
    );
  }

  private toCohortSummary(cohortId: string): CohortSummary {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      throw new DomainError(`Cohort ${cohortId} was not found.`, 500);
    }

    return {
      ...cohort,
      creator_count: this.getActiveMembershipsForCohort(cohortId).length
    };
  }

  private assertPositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new DomainError(`${field} must be a positive integer.`);
    }
  }

  private assertNonNegativeInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new DomainError(`${field} must be a non-negative integer.`);
    }
  }

  private assertValidCreatorRequest(request: CreateCreatorRequest): void {
    const requiredFields: Array<keyof CreateCreatorRequest> = [
      "name",
      "email_address",
      "phone_number",
      "course_type"
    ];

    for (const field of requiredFields) {
      if (typeof request[field] !== "string" || request[field].trim().length === 0) {
        throw new DomainError(`${field} is required.`);
      }
    }
  }

  private normalizeRemovalReason(removalReason: string): string {
    const normalized = removalReason.trim();
    return normalized.length > 0 ? normalized : DEFAULT_REMOVAL_REASON;
  }
}

export const waitingListService = new WaitingListService();
