export interface Creator {
  id: string;
  name: string;
  email_address: string;
  phone_number: string;
  course_type: string;
  created_at: string;
}

export interface CreatorInput {
  name: string;
  email_address: string;
  phone_number: string;
  course_type: string;
}

export interface CreatorCohort {
  id: string;
  creator_id: string;
  cohort_id: string;
  added_at: string;
  created_at: string;
  removed_at?: string;
  removal_reason?: string;
}

export interface RemovedCreator extends Creator {
  creator_cohort: CreatorCohort;
}

export interface CohortSummary {
  id: string;
  name: string;
  capacity: number;
  created_at: string;
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

export interface TakeCreatorsResponse {
  removed_count: number;
  removed_creators: RemovedCreator[];
  waiting_list: WaitingListResponse;
}

export async function getWaitingList(): Promise<WaitingListResponse> {
  return apiRequest<WaitingListResponse>("/api/waiting-list");
}

export async function createWaitingList(capacity: number): Promise<WaitingListResponse> {
  return apiRequest<WaitingListResponse>("/api/waiting-list", {
    method: "POST",
    body: JSON.stringify({ capacity })
  });
}

export async function addCreators(creators: CreatorInput[]): Promise<AddCreatorsResponse> {
  return apiRequest<AddCreatorsResponse>("/api/waiting-list/creators", {
    method: "POST",
    body: JSON.stringify({ creators })
  });
}

export async function takeCreators(count: number, removalReason?: string): Promise<TakeCreatorsResponse> {
  return apiRequest<TakeCreatorsResponse>("/api/waiting-list/take", {
    method: "POST",
    body: JSON.stringify({ count, removal_reason: removalReason })
  });
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => undefined);
    throw new Error(errorBody?.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}
