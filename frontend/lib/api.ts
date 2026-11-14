import {
  ApplicationDetail,
  ApplicationListResponse,
  BulkActionResponse,
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

const API_PROXY_PREFIX = "/api/backend";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function fetchFromProxy<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_PROXY_PREFIX}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?session_expired=1";
    }
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    let errorData = null;
    try {
      errorData = await res.json();
      if (Array.isArray(errorData.details) && errorData.details.length > 0) {
        const first = errorData.details[0];
        const field = first.loc ? first.loc.slice(1).join(".") : "";
        errorDetail = field ? `${field}: ${first.msg}` : first.msg || errorDetail;
      } else {
        errorDetail =
          errorData.message ||
          errorData.detail?.message ||
          errorData.detail ||
          `Request failed with status ${res.status}`;
      }
    } catch {
      errorDetail = `Request failed with status ${res.status}`;
    }
    throw new ApiError(errorDetail, res.status, errorData);
  }

  return res.json();
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export async function loginHR(email: string, password: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.message || "Invalid credentials", res.status, data);
  }

  return data;
}

export async function logoutHR(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function getMe(): Promise<HRUser> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    throw new ApiError("Not authenticated", res.status);
  }
  return res.json();
}

// ─── Jobs API ────────────────────────────────────────────────────────────────

export async function listAllJobs(
  statusFilter?: string,
  department?: string
): Promise<JobRole[]> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
  if (department) params.set("department", department);

  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchFromProxy<JobRole[]>(`/jobs/all${query}`);
}

export async function getJob(jobId: string): Promise<JobRole> {
  return fetchFromProxy<JobRole>(`/jobs/${jobId}`);
}

export async function createJob(payload: JobCreatePayload): Promise<JobRole> {
  return fetchFromProxy<JobRole>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishJob(jobId: string): Promise<JobRole> {
  return fetchFromProxy<JobRole>(`/jobs/${jobId}/publish`, {
    method: "POST",
  });
}

export async function closeJob(jobId: string): Promise<JobRole> {
  return fetchFromProxy<JobRole>(`/jobs/${jobId}/close`, {
    method: "POST",
  });
}

export async function markLinkedinPosted(jobId: string): Promise<JobRole> {
  return fetchFromProxy<JobRole>(`/jobs/${jobId}/mark-linkedin-posted`, {
    method: "POST",
  });
}

export async function previewJobContent(
  payload: JobContentPreviewPayload
): Promise<JobContentPreviewResponse> {
  return fetchFromProxy<JobContentPreviewResponse>("/jobs/preview-content", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Applications & Pipeline API ─────────────────────────────────────────────

export interface ListApplicationsParams {
  job_role_id?: string;
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listApplications(
  params: ListApplicationsParams = {}
): Promise<ApplicationListResponse> {
  const queryParams = new URLSearchParams();
  if (params.job_role_id) queryParams.set("job_role_id", params.job_role_id);
  if (params.status && params.status !== "ALL") queryParams.set("status", params.status);
  if (params.source) queryParams.set("source", params.source);
  if (params.search) queryParams.set("search", params.search);
  if (params.page) queryParams.set("page", params.page.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());

  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
  return fetchFromProxy<ApplicationListResponse>(`/applications${query}`);
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}`);
}

export async function screenApplication(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}/screen`, {
    method: "PATCH",
    body: JSON.stringify({ remarks, status_version }),
  });
}

export async function shortlistApplication(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}/shortlist`, {
    method: "PATCH",
    body: JSON.stringify({ remarks, status_version }),
  });
}

export async function rejectApplication(
  id: string,
  reason: RejectionReason | string,
  remarks?: string,
  custom_message?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason, remarks, custom_message, status_version }),
  });
}

export async function acceptOffer(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}/accept-offer`, {
    method: "POST",
    body: JSON.stringify({ remarks, status_version }),
  });
}

export async function declineOffer(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}/decline-offer`, {
    method: "POST",
    body: JSON.stringify({ remarks, status_version }),
  });
}

export async function lapseOffer(
  id: string,
  remarks?: string,
  status_version?: number
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${id}/lapse-offer`, {
    method: "POST",
    body: JSON.stringify({ remarks, status_version }),
  });
}

export async function bulkShortlist(
  application_ids: string[],
  remarks?: string
): Promise<BulkActionResponse> {
  return fetchFromProxy<BulkActionResponse>("/applications/bulk-shortlist", {
    method: "POST",
    body: JSON.stringify({ application_ids, remarks }),
  });
}

export async function bulkReject(
  application_ids: string[],
  reason: RejectionReason | string,
  remarks?: string
): Promise<BulkActionResponse> {
  return fetchFromProxy<BulkActionResponse>("/applications/bulk-reject", {
    method: "POST",
    body: JSON.stringify({ application_ids, reason, remarks }),
  });
}

export async function uploadCvManually(formData: FormData): Promise<any> {
  return fetchFromProxy<any>("/applications/upload", {
    method: "POST",
    body: formData,
  });
}

// ─── Resumes API ─────────────────────────────────────────────────────────────

export async function getResumePresignedUrl(
  resumeId: string,
  expiresIn: number = 900
): Promise<{ download_url: string; file_name: string }> {
  const data = await fetchFromProxy<{ download_url: string; file_name: string }>(
    `/resumes/${resumeId}/presigned-url?expires_in=${expiresIn}`
  );
  if (data?.download_url && data.download_url.includes("minio:9000")) {
    data.download_url = data.download_url.replace("minio:9000", "localhost:9000");
  }
  return data;
}

// ─── CV Bank API ─────────────────────────────────────────────────────────────

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

export async function getCVBank(params: CVBankFilterQuery = {}): Promise<CVBankListResponse> {
  const query = new URLSearchParams();
  if (params.job_role_id) query.set("job_role_id", params.job_role_id);
  if (params.status) query.set("status", params.status);
  if (params.min_score !== undefined && params.min_score !== null)
    query.set("min_score", params.min_score.toString());
  if (params.source) query.set("source", params.source);
  if (params.skill) query.set("skill", params.skill);
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const qs = query.toString();
  return fetchFromProxy<CVBankListResponse>(`/cv-bank${qs ? `?${qs}` : ""}`);
}

export async function exportCVBankCSV(
  params: Omit<CVBankFilterQuery, "page" | "limit"> = {}
): Promise<Blob> {
  const query = new URLSearchParams();
  if (params.job_role_id) query.set("job_role_id", params.job_role_id);
  if (params.status) query.set("status", params.status);
  if (params.min_score !== undefined && params.min_score !== null)
    query.set("min_score", params.min_score.toString());
  if (params.source) query.set("source", params.source);
  if (params.skill) query.set("skill", params.skill);
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);
  if (params.search) query.set("search", params.search);

  const qs = query.toString();
  const url = `${API_PROXY_PREFIX}/cv-bank/export${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError("Failed to export CSV", res.status);
  }
  return res.blob();
}

// ─── Interviews API ──────────────────────────────────────────────────────────

export async function getTodayInterviews(): Promise<InterviewItem[]> {
  return fetchFromProxy<InterviewItem[]>("/interviews/today");
}

export async function listInterviews(params: {
  job_role_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
} = {}): Promise<InterviewItem[]> {
  const queryParams = new URLSearchParams();
  if (params.job_role_id) queryParams.set("job_role_id", params.job_role_id);
  if (params.status) queryParams.set("status", params.status);
  if (params.date_from) queryParams.set("date_from", params.date_from);
  if (params.date_to) queryParams.set("date_to", params.date_to);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
  return fetchFromProxy<InterviewItem[]>(`/interviews${query}`);
}

export async function completeInterview(interviewId: string): Promise<InterviewItem> {
  return fetchFromProxy<InterviewItem>(`/interviews/${interviewId}/complete`, {
    method: "POST",
  });
}

export async function markInterviewNoShow(interviewId: string): Promise<InterviewItem> {
  return fetchFromProxy<InterviewItem>(`/interviews/${interviewId}/no-show`, {
    method: "POST",
  });
}

export async function makeOffer(
  applicationId: string,
  remarks?: string
): Promise<ApplicationDetail> {
  return fetchFromProxy<ApplicationDetail>(`/applications/${applicationId}/offer`, {
    method: "POST",
    body: JSON.stringify({ remarks }),
  });
}

export async function getApplicationInterviews(applicationId: string): Promise<InterviewItem[]> {
  return fetchFromProxy<InterviewItem[]>(`/applications/${applicationId}/interviews`);
}

export async function scheduleInterview(payload: InterviewCreatePayload): Promise<InterviewItem> {
  return fetchFromProxy<InterviewItem>("/interviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function rescheduleInterview(
  interviewId: string,
  payload: InterviewReschedulePayload
): Promise<InterviewItem> {
  return fetchFromProxy<InterviewItem>(`/interviews/${interviewId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelInterview(
  interviewId: string,
  cancellation_reason: string
): Promise<InterviewItem> {
  return fetchFromProxy<InterviewItem>(`/interviews/${interviewId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancellation_reason }),
  });
}

export async function listHRUsers(): Promise<HRUserSimple[]> {
  return fetchFromProxy<HRUserSimple[]>("/auth/hr-users");
}

export async function submitInterviewFeedback(
  interviewId: string,
  payload: InterviewFeedbackCreatePayload
): Promise<InterviewFeedbackItem> {
  return fetchFromProxy<InterviewFeedbackItem>(`/interviews/${interviewId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
