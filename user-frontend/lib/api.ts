export interface JobSummary {
  id: string;
  title: string;
  department: string;
  location?: string | null;
  work_mode?: string | null;
  employment_type?: string | null;
  application_deadline?: string | null;
  applications_still_open: boolean;
  created_at: string;
}

export interface JobDetail {
  id: string;
  title: string;
  department: string;
  location?: string | null;
  work_mode?: string | null;
  employment_type?: string | null;
  education_qualification?: string | null;
  min_experience_years?: number | null;
  required_skills?: string[] | null;
  responsibilities_text?: string | null;
  salary_band?: string | null;
  jd_text?: string | null;
  application_deadline?: string | null;
  applications_still_open: boolean;
  created_at: string;
}

export interface ApplicationSubmitResponse {
  reference_number: string;
  job_title: string;
  message: string;
}

export interface ApplicationTrackResponse {
  reference_number: string;
  job_title: string;
  applied_at: string;
  status_label: string;
  status_stage: number;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  details?: Record<string, any>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/v1";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorObj: ApiError = {
      status: res.status,
      error: data.error || "request_failed",
      message: data.message || `Request failed with status ${res.status}`,
      details: data.details,
    };
    throw errorObj;
  }

  if (data && typeof data === "object" && "data" in data && "success" in data && data.data !== undefined) {
    return data.data as T;
  }

  return data as T;
}

export async function getPublishedJobs(search?: string): Promise<JobSummary[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return fetchApi<JobSummary[]>(`/jobs${query}`, { cache: "no-store" });
}

export async function getJobDetail(id: string): Promise<JobDetail> {
  return fetchApi<JobDetail>(`/jobs/${id}`, { cache: "no-store" });
}

export async function submitApplication(formData: FormData): Promise<ApplicationSubmitResponse> {
  return fetchApi<ApplicationSubmitResponse>("/applications", {
    method: "POST",
    body: formData,
  });
}

export async function trackApplication(
  email: string,
  referenceNumber: string
): Promise<ApplicationTrackResponse> {
  const params = new URLSearchParams({
    email: email.trim(),
    reference_number: referenceNumber.trim(),
  });
  return fetchApi<ApplicationTrackResponse>(`/applications/track?${params.toString()}`, {
    cache: "no-store",
  });
}
