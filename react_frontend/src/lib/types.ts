export interface HRUser {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface HRUserSimple {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export type RejectionReason =
  | "insufficient_experience"
  | "role_filled"
  | "overqualified"
  | "no_response"
  | "other"
  | string;

export interface BulkActionResponse {
  success: boolean;
  count?: number;
  message?: string;
  updated_ids?: string[];
  failed_ids?: string[];
}

export interface InterviewCreatePayload {
  application_id: string;
  round_number?: number;
  round_name?: string;
  scheduled_at: string;
  duration_minutes?: number;
  mode: "video" | "phone" | "in_person" | string;
  location?: string;
  meeting_link?: string;
  interviewer_id?: string;
  interviewer_ids?: string[];
  interviewer_name?: string;
  interviewer_email?: string;
  hr_notes?: string;
  notes?: string;
}

export interface InterviewReschedulePayload {
  scheduled_at: string;
  duration_minutes?: number;
  meeting_link?: string;
  reason?: string;
}

export interface InterviewFeedbackCreatePayload {
  technical_score: number;
  communication_score: number;
  cultural_fit_score?: number;
  culture_fit_score?: number;
  problem_solving_score?: number;
  recommendation: "hire" | "hold" | "reject" | string;
  feedback_notes?: string;
  notes?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
}

export interface InterviewFeedbackItem {
  id: string;
  interview_id: string;
  technical_score: number;
  communication_score: number;
  cultural_fit_score: number;
  recommendation: string;
  feedback_notes?: string;
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
  min_salary?: number;
  max_salary?: number;
  description?: string;
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
  | "SCREENING"
  | "SHORTLISTED"
  | "REJECTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "INTERVIEW_COMPLETED"
  | "OFFERED"
  | "OFFER_EXTENDED"
  | "OFFER_ACCEPTED"
  | "HIRED"
  | "OFFER_DECLINED"
  | "OFFER_LAPSED"
  | "CLOSED"
  | "WITHDRAWN";

export type ApplicationSource = "portal" | "linkedin" | "email_upload";

export interface CandidateInfo {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string;
  location?: string;
  current_title?: string;
  total_experience_years?: number;
  skills?: string[];
  linkedin_url?: string;
  portfolio_url?: string;
  created_at: string;
}

export interface ResumeInfo {
  id: string;
  file_name?: string;
  original_filename?: string;
  file_url: string;
  download_url?: string;
  file_size?: number;
  file_size_bytes?: number;
  parse_status: string;
  parsed_json?: Record<string, any>;
  parsed_text?: string;
  parse_error?: string;
  parsed_at?: string;
  created_at: string;
}

export interface ScreeningResultInfo {
  id: string;
  score?: number;
  overall_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  hard_filter_passed?: boolean;
  experience_years_detected?: number;
  recommendation?: string;
  llm_rationale?: string;
  summary?: string;
  created_at: string;
}

export interface StatusHistoryItem {
  id: string;
  from_status?: string;
  old_status?: string;
  to_status: string;
  new_status?: string;
  reason?: string;
  remarks?: string;
  changed_by_type?: "hr" | "system";
  changed_by?: string;
  changed_by_name?: string;
  changed_at: string;
  created_at?: string;
}

export interface UpcomingInterviewInfo {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: "phone" | "video" | "in_person" | string;
  status: string;
  meeting_link?: string;
  location?: string;
  interviewer_name?: string;
}

export interface ApplicationDetail {
  id: string;
  reference_number: string;
  candidate: CandidateInfo;
  candidate_id?: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  job_id?: string;
  job_role_id?: string;
  job_title: string;
  department: string;
  applied_at: string;
  created_at?: string;
  source: ApplicationSource;
  current_status: ApplicationStatus;
  status: ApplicationStatus;
  status_version?: number;
  match_score?: number;
  screening_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  recruiter_notes?: string;
  rejection_reason?: string;
  resume?: ResumeInfo;
  screening_result?: ScreeningResultInfo;
  status_history: StatusHistoryItem[];
  timeline?: StatusHistoryItem[];
  upcoming_interview?: UpcomingInterviewInfo | null;
}

export interface ApplicationListItem {
  id: string;
  reference_number: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  candidate_title?: string;
  job_id?: string;
  job_role_id?: string;
  job_title: string;
  department?: string;
  job_department?: string;
  applied_at: string;
  source: ApplicationSource;
  current_status: ApplicationStatus;
  status: ApplicationStatus;
  status_version?: number;
  match_score?: number;
  screening_score?: number;
  hard_filter_passed?: boolean;
  matched_skills?: string[];
  missing_skills?: string[];
  resume_id?: string;
  resume_file_name?: string;
  upcoming_interview?: UpcomingInterviewInfo | null;
}

export interface ApplicationListResponse {
  items: ApplicationListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
  pages?: number;
}

export interface InterviewItem {
  id: string;
  application_id: string;
  candidate_id?: string;
  job_role_id?: string;
  job_id?: string;
  round_number: number;
  round_name: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: "video" | "phone" | "in_person" | string;
  location?: string;
  meeting_link?: string;
  interviewer_id?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  cancellation_reason?: string;
  hr_notes?: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  job_title?: string;
  job_department?: string;
  feedback_entries?: any[];
  created_at: string;
}

export interface CVBankItem {
  id?: string;
  application_id: string;
  reference_number: string;
  applied_at: string;
  current_status: ApplicationStatus;
  status?: ApplicationStatus;
  source: ApplicationSource;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  job_role_id?: string;
  job_id?: string;
  job_title: string;
  department: string;
  job_department?: string;
  screening_score?: number;
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
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
  total_pages?: number;
  pages?: number;
}
