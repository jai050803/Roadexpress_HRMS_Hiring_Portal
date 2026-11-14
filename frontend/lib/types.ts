export interface HRUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export type JobStatus = "draft" | "published" | "closed";
export type WorkMode = "remote" | "onsite" | "hybrid";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

export interface JobRole {
  id: string;
  title: string;
  department: string;
  employment_type?: EmploymentType | string;
  location?: string;
  work_mode?: WorkMode | string;
  education_qualification?: string;
  min_experience_years?: number;
  required_skills?: string[];
  responsibilities_text?: string;
  salary_band?: string;
  jd_text?: string;
  application_deadline?: string;
  max_applications?: number;
  applications_count: number;
  status: JobStatus;
  linkedin_post_copy?: string;
  linkedin_posted: boolean;
  linkedin_posted_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  applications_still_open: boolean;
}

export interface JobCreatePayload {
  title: string;
  department: string;
  employment_type?: string;
  location?: string;
  work_mode?: string;
  education_qualification?: string;
  min_experience_years?: number;
  required_skills?: string[];
  responsibilities_text?: string;
  salary_band?: string;
  application_deadline?: string;
  max_applications?: number;
}

export interface JobContentPreviewPayload {
  title: string;
  department: string;
  employment_type?: string;
  location?: string;
  work_mode?: string;
  education_qualification?: string;
  min_experience_years?: number;
  required_skills?: string[];
  responsibilities_text?: string;
  salary_band?: string;
  job_id?: string;
}

export interface JobContentPreviewResponse {
  jd_text: string;
  linkedin_post_copy: string;
}


export type ApplicationStatus =
  | "APPLIED"
  | "SCREENED"
  | "SHORTLISTED"
  | "REJECTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "INTERVIEW_COMPLETED"
  | "OFFERED"
  | "OFFER_EXTENDED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "OFFER_LAPSED"
  | "CLOSED"
  | "WITHDRAWN";

export type ApplicationSource = "portal" | "linkedin" | "email_upload";

export type RejectionReason =
  | "insufficient_experience"
  | "role_filled"
  | "overqualified"
  | "no_response"
  | "other";

export interface CandidateInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface ResumeInfo {
  id: string;
  file_name?: string;
  file_url: string;
  download_url?: string;
  file_size_bytes?: number;
  parse_status: string;
  parsed_json?: Record<string, any>;
  parse_error?: string;
  parsed_at?: string;
  created_at: string;
}

export interface ScreeningResultInfo {
  id: string;
  score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  hard_filter_passed?: boolean;
  experience_years_detected?: number;
  recommendation?: string;
  reasoning?: string;
  created_at: string;
}

export interface StatusHistoryItem {
  id: string;
  from_status?: string;
  to_status: string;
  reason?: string;
  remarks?: string;
  changed_by_type?: 'hr' | 'system';
  changed_by?: string;
  changed_at: string;
}

export interface UpcomingInterviewInfo {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: "phone" | "video" | "in_person" | string;
  status: string;
  meeting_link?: string;
  location?: string;
}

export interface ApplicationDetail {
  id: string;
  reference_number: string;
  candidate: CandidateInfo;
  job_role_id: string;
  job_title: string;
  department: string;
  applied_at: string;
  source: ApplicationSource;
  current_status: ApplicationStatus;
  status_version: number;
  status_label: string;
  status_stage: number;
  uploaded_by_hr?: string;
  resume?: ResumeInfo;
  screening_result?: ScreeningResultInfo;
  status_history: StatusHistoryItem[];
  upcoming_interview?: UpcomingInterviewInfo | null;
}

export interface ApplicationListItem {
  id: string;
  reference_number: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  job_role_id: string;
  job_title: string;
  department: string;
  applied_at: string;
  source: ApplicationSource;
  current_status: ApplicationStatus;
  status_version: number;
  status_label: string;
  status_stage: number;
  screening_score?: number;
  hard_filter_passed?: boolean;
  matched_skills?: string[];
  missing_skills?: string[];
  resume_file_name?: string;
  upcoming_interview?: UpcomingInterviewInfo | null;
}

export interface ApplicationListResponse {
  items: ApplicationListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BulkActionResponse {
  processed_count: number;
  skipped_count: number;
  errors: string[];
}

export interface CVBankItem {
  application_id: string;
  reference_number: string;
  applied_at: string;
  current_status: ApplicationStatus;
  source: ApplicationSource;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  job_role_id: string;
  job_title: string;
  department: string;
  screening_score?: number;
  matched_skills?: string[];
  hard_filter_passed?: boolean;
  resume_id?: string;
  resume_file_name?: string;
  resume_download_url?: string;
}

export interface CVBankListResponse {
  items: CVBankItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface HRUserSimple {
  id: string;
  name: string;
}

export interface InterviewCreatePayload {
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: "phone" | "video" | "in_person";
  location?: string;
  meeting_link?: string;
  interviewer_ids?: string[];
  hr_notes?: string;
}

export interface InterviewReschedulePayload {
  scheduled_at: string;
  meeting_link?: string;
}

export interface InterviewFeedbackCreatePayload {
  overall_rating: number;
  technical_rating?: number;
  communication_rating?: number;
  culture_rating?: number;
  decision: "proceed" | "hold" | "reject";
  strengths?: string;
  concerns?: string;
  additional_notes?: string;
}

export interface InterviewFeedbackItem {
  id: string;
  interview_id: string;
  submitted_by: string;
  overall_rating?: number;
  technical_rating?: number;
  communication_rating?: number;
  culture_rating?: number;
  decision?: "proceed" | "hold" | "reject";
  strengths?: string;
  concerns?: string;
  additional_notes?: string;
  submitted_at: string;
}

export interface InterviewItem {
  id: string;
  application_id: string;
  candidate_id?: string;
  job_role_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: "phone" | "video" | "in_person";
  location?: string;
  meeting_link?: string;
  interviewer_ids?: string[];
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  cancellation_reason?: string;
  hr_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  candidate_name?: string;
  candidate_email?: string;
  job_title?: string;
  feedback?: InterviewFeedbackItem[];
}
