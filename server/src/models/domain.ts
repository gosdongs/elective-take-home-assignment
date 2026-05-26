export interface Creator {
    id: string;
    name: string;
    email_address: string;
    phone_number: string;
    course_type: string;
    created_at: string;
}

export interface Cohort {
    id: string;
    name: string;
    capacity: number;
    created_at: string;
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
