import { http } from "../integration/httpIntegration";
import {
  ApplicationDetail,
  ApplicationListResponse,
  BulkActionResponse,
  CandidateInfo,
  CVBankListResponse,
  HRUser,
  HRUserSimple,
  InterviewCreatePayload,
  InterviewFeedbackCreatePayload,
  InterviewFeedbackItem,
  InterviewItem,
  InterviewReschedulePayload,
  JobContentPreviewPayload,
  JobContentPreviewResponse,
  JobCreatePayload,
  JobRole,
  RejectionReason,
} from "./types";

export interface ListApplicationsParams {
  job_role_id?: string;
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CVBankFilterQuery {
  job_role_id?: string;
  status?: string;
  min_score?: number;
  source?: string;
  skill?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function loginHR(email: string, password: string): Promise<{ success: boolean; token?: string; user?: HRUser }> {
  const res = await http.post<any>("/auth/login", { email, password });
  const token = res?.token || res?.data?.token;
  const user = res?.user || res?.data?.user;
  if (token) {
    localStorage.setItem("roadexpress_hiring_token", token);
  }
  if (user) {
    localStorage.setItem("roadexpress_hiring_user", JSON.stringify(user));
  }
  return { success: true, token, user };
}

export async function logoutHR(): Promise<void> {
  try {
    await http.post("/auth/logout");
  } catch {
    // continue cleanup
  }
  localStorage.removeItem("roadexpress_hiring_token");
  window.dispatchEvent(new Event("roadexpress_auth_changed"));
}

export async function getMe(): Promise<HRUser> {
  return http.get<HRUser>("/auth/me");
}

export async function listHRUsers(): Promise<HRUserSimple[]> {
  return http.get<HRUserSimple[]>("/auth/hr-users");
}

export async function listAllJobs(
  statusFilter?: string,
  department?: string
): Promise<JobRole[]> {
  const params: Record<string, any> = {};
  if (statusFilter && statusFilter !== "all") params.status = statusFilter;
  if (department) params.department = department;

  try {
    const res = await http.get<any>("/jobs", params);
    if (Array.isArray(res)) return res;
    if (res?.jobs && Array.isArray(res.jobs)) return res.jobs;
    if (res?.items && Array.isArray(res.items)) return res.items;
    return [];
  } catch (err) {
    return [];
  }
}

export async function getJob(jobId: string): Promise<JobRole> {
  return http.get<JobRole>(`/jobs/${jobId}`);
}

export async function createJob(payload: JobCreatePayload): Promise<JobRole> {
  return http.post<JobRole>("/jobs", payload);
}

export async function publishJob(jobId: string): Promise<JobRole> {
  return http.post<JobRole>(`/jobs/${jobId}/publish`);
}

export async function closeJob(jobId: string): Promise<JobRole> {
  return http.post<JobRole>(`/jobs/${jobId}/close`);
}

export async function markLinkedinPosted(jobId: string): Promise<JobRole> {
  return http.post<JobRole>(`/jobs/${jobId}/mark-linkedin-posted`);
}

export async function previewJobContent(
  payload: JobContentPreviewPayload
): Promise<JobContentPreviewResponse> {
  return http.post<JobContentPreviewResponse>("/jobs/preview-content", payload);
}

export async function listCandidates(params: {
  search?: string;
  skill?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ candidates: CandidateInfo[]; total: number; page: number; limit: number }> {
  try {
    const res = await http.get<any>("/candidates", params);
    if (res?.candidates) return res;
    if (Array.isArray(res)) {
      return { candidates: res, total: res.length, page: params.page || 1, limit: params.limit || 50 };
    }
    return { candidates: [], total: 0, page: 1, limit: 50 };
  } catch {
    return { candidates: [], total: 0, page: 1, limit: 50 };
  }
}

export async function getCandidate(id: string): Promise<CandidateInfo & { applications?: ApplicationDetail[] }> {
  return http.get<CandidateInfo & { applications?: ApplicationDetail[] }>(`/candidates/${id}`);
}

export async function listApplications(
  params: ListApplicationsParams = {}
): Promise<ApplicationListResponse> {
  try {
    const res = await http.get<any>("/applications", params);
    if (res?.items) return res;
    if (Array.isArray(res)) {
      return {
        items: res,
        total: res.length,
        page: params.page || 1,
        limit: params.limit || 50,
        pages: 1,
      };
    }
    return { items: [], total: 0, page: 1, limit: 50, pages: 1 };
  } catch (err) {
    return { items: [], total: 0, page: 1, limit: 50, pages: 1 };
  }
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  return http.get<ApplicationDetail>(`/applications/${id}`);
}

export async function screenApplication(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return http.patch<ApplicationDetail>(`/applications/${id}/screen`, { remarks, status_version });
}

export async function shortlistApplication(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return http.patch<ApplicationDetail>(`/applications/${id}/shortlist`, { remarks, status_version });
}

export async function rejectApplication(
  id: string,
  reason: RejectionReason | string,
  remarks?: string,
  custom_message?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return http.patch<ApplicationDetail>(`/applications/${id}/reject`, {
    reason,
    remarks,
    custom_message,
    status_version,
  });
}

export async function acceptOffer(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return http.post<ApplicationDetail>(`/applications/${id}/accept-offer`, { remarks, status_version });
}

export async function declineOffer(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return http.post<ApplicationDetail>(`/applications/${id}/decline-offer`, { remarks, status_version });
}

export async function lapseOffer(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return http.post<ApplicationDetail>(`/applications/${id}/lapse-offer`, { remarks, status_version });
}

export async function bulkShortlist(
  application_ids: string[],
  remarks?: string
): Promise<BulkActionResponse> {
  return http.post<BulkActionResponse>("/applications/bulk-shortlist", { application_ids, remarks });
}

export async function bulkReject(
  application_ids: string[],
  reason: RejectionReason | string,
  remarks?: string
): Promise<BulkActionResponse> {
  return http.post<BulkActionResponse>("/applications/bulk-reject", { application_ids, reason, remarks });
}

export async function uploadCvManually(formData: FormData): Promise<any> {
  return http.post<any>("/applications/upload", formData);
}

export async function getResumePresignedUrl(
  resumeId: string,
  expiresIn: number = 900
): Promise<{ download_url: string; file_name: string }> {
  return http.get<{ download_url: string; file_name: string }>(
    `/resumes/${resumeId}/presigned-url`,
    { expires_in: expiresIn }
  );
}

export async function getCVBank(params: CVBankFilterQuery = {}): Promise<CVBankListResponse> {
  try {
    const res = await http.get<any>("/cv-bank", params);
    if (res?.items) return res;
    if (Array.isArray(res)) {
      return {
        items: res,
        total: res.length,
        page: params.page || 1,
        limit: params.limit || 50,
        pages: 1,
      };
    }
    return { items: [], total: 0, page: 1, limit: 50, pages: 1 };
  } catch (err) {
    return { items: [], total: 0, page: 1, limit: 50, pages: 1 };
  }
}

export async function exportCVBankCSV(
  params: Omit<CVBankFilterQuery, "page" | "limit"> = {}
): Promise<Blob> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      query.append(k, String(v));
    }
  });
  const qs = query.toString();
  const res = await fetch(`/api/v1/hiring/cv-bank/export${qs ? `?${qs}` : ""}`);
  return res.blob();
}

export async function getTodayInterviews(): Promise<InterviewItem[]> {
  try {
    const res = await http.get<any>("/interviews/today");
    if (Array.isArray(res)) return res;
    if (res?.interviews && Array.isArray(res.interviews)) return res.interviews;
    return [];
  } catch {
    return [];
  }
}

export async function listInterviews(params: {
  job_role_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
} = {}): Promise<InterviewItem[]> {
  try {
    const res = await http.get<any>("/interviews", params);
    if (Array.isArray(res)) return res;
    if (res?.interviews && Array.isArray(res.interviews)) return res.interviews;
    return [];
  } catch {
    return [];
  }
}

export async function completeInterview(interviewId: string): Promise<InterviewItem> {
  return http.post<InterviewItem>(`/interviews/${interviewId}/complete`);
}

export async function markInterviewNoShow(interviewId: string): Promise<InterviewItem> {
  return http.post<InterviewItem>(`/interviews/${interviewId}/no-show`);
}

export async function makeOffer(
  applicationId: string,
  remarks?: string
): Promise<ApplicationDetail> {
  return http.post<ApplicationDetail>(`/applications/${applicationId}/offer`, { remarks });
}

export async function getApplicationInterviews(applicationId: string): Promise<InterviewItem[]> {
  try {
    const res = await http.get<any>(`/applications/${applicationId}/interviews`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function scheduleInterview(payload: InterviewCreatePayload): Promise<InterviewItem> {
  return http.post<InterviewItem>("/interviews", payload);
}

export async function rescheduleInterview(
  interviewId: string,
  payload: InterviewReschedulePayload
): Promise<InterviewItem> {
  return http.patch<InterviewItem>(`/interviews/${interviewId}/reschedule`, payload);
}

export async function cancelInterview(
  interviewId: string,
  cancellation_reason: string
): Promise<InterviewItem> {
  return http.post<InterviewItem>(`/interviews/${interviewId}/cancel`, { cancellation_reason });
}

export async function submitInterviewFeedback(
  interviewId: string,
  payload: InterviewFeedbackCreatePayload
): Promise<InterviewFeedbackItem> {
  return http.post<InterviewFeedbackItem>(`/interviews/${interviewId}/feedback`, payload);
}
