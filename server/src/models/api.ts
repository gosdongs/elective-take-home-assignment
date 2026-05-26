import type { Cohort, Creator, CreatorCohort } from "./domain";

export interface CreateWaitingListRequest {
  capacity?: number;
}

export interface CreateCreatorRequest {
  name: string;
  email_address: string;
  phone_number: string;
  course_type: string;
}

export interface AddCreatorsRequest {
  creators: CreateCreatorRequest[];
}

export interface TakeCreatorsRequest {
  count: number;
  removal_reason?: string;
}

export interface CohortSummary extends Cohort {
  creator_count: number;
  creators: Creator[];
}

export interface WaitingListResponse {
  capacity: number;
  total_creators_waiting: number;
  cohorts: CohortSummary[];
}

export interface AddCreatorsResponse {
  added_creators: Creator[];
  waiting_list: WaitingListResponse;
}

export interface RemovedCreator extends Creator {
  creator_cohort: CreatorCohort;
}

export interface TakeCreatorsResponse {
  removed_count: number;
  removed_creators: RemovedCreator[];
  waiting_list: WaitingListResponse;
}

export interface CountResponse {
  total_creators_waiting: number;
}

export interface ErrorResponse {
  message: string;
  details?: unknown;
}
