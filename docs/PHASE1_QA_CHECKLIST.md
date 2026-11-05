# Road Express HRMS & Hiring Portal — Phase 1 QA Manual Test Checklist

This checklist defines the complete end-to-end manual acceptance testing plan for **Phase 1** of the Road Express HRMS & Hiring Portal.

> [!NOTE]
> **Company Domain Boundary:**
> Road Express is a logistics technology and operations aggregator — we do **not** own trucks or employ truck drivers.
> Hiring focuses on corporate and operational excellence: **Accounts & Finance, Supply Chain & Logistics, Team Leads / Operations Managers, Human Resources, Engineering, and Data Analysis**.

---

## 1. Candidate Persona Checklist (Mobile & Desktop)

The Candidate Portal is clean, responsive, and mobile-first, operating without login or session authentication.

### CP-01 · Job Browsing & Search (`/jobs`)
- [ ] **Published Roles Only:** Verify that only job roles with status `published` are displayed in the listings. Draft and closed roles must never appear.
- [ ] **Job Card Metadata:** Ensure every job card displays Title, Department, Location, Work Mode (e.g. Remote, Onsite, Hybrid), Employment Type, and Application Deadline.
- [ ] **Zero Drivers/Truck Roles:** Verify that search suggestions and default listings reflect Road Express corporate departments (Accounts, Engineering, Supply Chain, HR, Data).
- [ ] **Filters:** Test filtering by Department and Work Mode. Verify instantaneous client/server filtering.
- [ ] **Apply CTA:** Clicking "Apply Now" navigates smoothly to `/jobs/{id}` or `/apply/{id}`.

### CP-02 · Job Role Details & JD Rendering (`/jobs/{id}`)
- [ ] **Formatted JD Display:** Verify that the rendered job description reflects markdown formatting accurately.
- [ ] **Omission of Empty Sections:** Confirm that if optional fields (such as salary band, education, or specific certifications) were left empty by HR, the section is completely omitted (no "N/A", "None", or placeholder text).
- [ ] **Deadline Countdown:** Verify the live countdown timer displays remaining days, hours, and minutes until the application deadline.
- [ ] **Closed State Banner:** If `max_applications` cap is reached or deadline has passed, verify that the application button is disabled and displays "Applications Closed".

### CP-03 · Application Submission Flow (`/apply/{id}`)
- [ ] **Idempotency Key Generation:** Verify that a unique UUID `idempotency_key` is generated in memory when the application form page mounts.
- [ ] **Field Validation:**
  - [ ] Name: Required (min 1 character).
  - [ ] Email: Required, validated email format.
  - [ ] Phone: Optional; accepts standard international/national formats.
- [ ] **Resume Upload Validation:**
  - [ ] Valid PDF (< 5MB): Successfully attaches with filename and size preview.
  - [ ] Non-PDF rejection: Attempting to upload a `.docx`, `.png`, or `.txt` file immediately displays an error before submission.
  - [ ] Oversized PDF (> 5MB): Attempting to upload a PDF larger than 5MB displays a "File exceeds 5MB limit" error.
- [ ] **Double Submission Prevention:** Double-clicking "Submit Application" rapidly sends only one network request and disables the button during in-flight upload.
- [ ] **Success Page (`/apply/success`):**
  - [ ] Displays prominent Reference Number formatted as `APP-YYYYMMDD-NNNN`.
  - [ ] Displays guidance instructing the candidate to retain the reference number for tracking.
  - [ ] Provides direct link to the Application Tracking page.

### CP-04 · Gate Concurrency & Edge Cases
- [ ] **Deadline Expiration Gate:** Attempting to submit after the deadline returns a `409 Conflict` (`error: "applications_closed"`).
- [ ] **Application Cap Gate:** Submitting when `applications_count >= max_applications` returns a `409 Conflict` (`error: "applications_closed"`).
- [ ] **Duplicate Application Check:** Submitting with the same candidate email to the same job role returns a `409 Conflict` (`error: "duplicate_application"`).
- [ ] **Idempotent Network Retry:** Re-submitting with the identical `idempotency_key` returns the existing `201 Created` payload with the same reference number without incrementing `applications_count`.

### CP-05 · Application Status Tracking (`/track`)
- [ ] **Tracking Lookup Form:** Candidate inputs their email address and reference number.
- [ ] **Privacy Check:** Entering a valid reference number with the wrong email returns a 404 "No application found matching the provided details".
- [ ] **Visual Progress Bar:** Displays the 4 plain-language candidate progress stages:
  1. *Application Received* (APPLIED)
  2. *Under Review* (SCREENED, INTERVIEWED, OFFERED)
  3. *Shortlisted — Interview Details Sent* (SHORTLISTED, INTERVIEW_SCHEDULED)
  4. *Not Selected* (REJECTED, CLOSED)
- [ ] **Status History Privacy:** Internal HR notes, rejection reasons, and scores are strictly omitted from the candidate tracking screen.

---

## 2. HR Persona Checklist (Desktop Data-Dense Portal)

The HR Admin Portal is protected by JWT authentication and optimized for high-volume recruitment workflows.

### HP-01 · Authentication & Session Security (`/login`)
- [ ] **Login Screen:** Input corporate email and password.
- [ ] **Invalid Credentials:** Submitting incorrect credentials returns a 401 Unauthorized with clean error messaging.
- [ ] **Token Storage:** Upon successful authentication, JWT access token is stored securely (HTTP-only cookie or authenticated state).
- [ ] **Protected Routes:** Direct navigation to `/dashboard`, `/jobs`, `/pipeline` without an active session immediately redirects to `/login`.
- [ ] **Logout:** Clicking Logout clears credentials and invalidates the session token via Redis blocklist.

### HP-02 · Dashboard Overview (`/dashboard`)
- [ ] **Metrics Cards:**
  - Total open roles count.
  - Total applications received today.
  - Distribution breakdown across candidate pipeline statuses.
- [ ] **Quick Action Links:** Direct buttons to "Create New Job Role" and "View Pipeline".

### HP-03 · Job Role Creation & Management (`/jobs`, `/jobs/new`)
- [ ] **Create Draft Role Form:**
  - Multi-section form: Title, Department, Location, Work Mode, Experience, Education, Skills tags, Responsibilities.
  - Optional fields clearly labeled.
- [ ] **Draft Preservation:** Newly created role enters `draft` state with `applications_count = 0`.
- [ ] **Preview JD:** Verify preview displays accurately generated Markdown text prior to publishing.
- [ ] **Publish Action:**
  - Changes status from `draft` to `published`.
  - Auto-generates markdown `jd_text`.
  - Auto-generates formatted `linkedin_post_copy`.
- [ ] **Edit Restriction on Published Roles:**
  - Verify that a `published` role cannot be converted back to `draft` (returns 400).
- [ ] **Close Role Action:**
  - Closing a role transitions status to `closed`.
  - Prevents further candidate applications immediately.

### HP-04 · LinkedIn Copy & Social Sharing (`/jobs/[id]`)
- [ ] **Formatted Copy Generation:**
  - Role headline + 2–3 sentence plain summary + application link: `{CANDIDATE_PORTAL_URL}/jobs/{id}`.
  - **Zero Emojis & Zero Hashtags:** Strict verification that copy contains no emojis and no `#` symbols.
- [ ] **Copy to Clipboard:** One-click copy button copies the exact copy text.
- [ ] **"Mark as Posted" Toggle:** Clicking records `linkedin_posted = true` and updates the timestamp.

### HP-05 · Pipeline View & Filtering (`/pipeline/[roleId]`)
- [ ] **Role Pipeline Table:**
  - Lists all applicants for the selected role.
  - Columns: Reference Number, Candidate Name, Email, Phone, Applied Date, Status Badge, Screening Score (if available), Actions.
- [ ] **Search & Filtering:**
  - Filter by candidate status (`APPLIED`, `SCREENED`, `SHORTLISTED`, `REJECTED`).
  - Search by candidate name or email.
- [ ] **Candidate Drawer / Modal (`/applications/[id]`):**
  - Displays full profile, application source (`portal` vs `email_upload`), uploaded resume preview link.
  - Timeline of status transitions with actor name and timestamps.
- [ ] **Pre-signed Resume URL:**
  - Clicking "View Resume" / "Download Resume" opens an S3/MinIO pre-signed URL expiring in 15 minutes.

### HP-06 · Manual CV Intake / Upload (`POST /applications/upload`)
- [ ] **HR Manual Upload Modal:**
  - For candidates who emailed their CVs directly to recruiters.
  - Form fields: Job Role (select published role), Candidate Name, Email, Phone, Resume PDF upload.
- [ ] **Status Validation:** Cannot upload to a draft or closed role (returns 400).
- [ ] **Source Tagging:** Verify the created application has `source = "email_upload"` and `uploaded_by_hr` set to the recruiter's UUID.
- [ ] **Gate Enforcement:** Uploading increments `applications_count` and passes through the atomic gate.

### HP-07 · Status Transitions & State Machine Enforcement
- [ ] **Shortlist Transition:**
  - Can only transition from `SCREENED` to `SHORTLISTED`.
  - Attempting to skip states (e.g. `APPLIED` -> `SHORTLISTED`) fails with 400 `invalid_transition`.
- [ ] **Rejection Transition:**
  - Can reject from any non-terminal state.
  - **Mandatory Rejection Reason:** Attempting to submit rejection without selecting a reason code fails with 422 Unprocessable Entity.
  - Custom Candidate Message: Optional personalized feedback string saved in internal remarks.
- [ ] **Terminal State Lockout:**
  - Attempting to transition an already `REJECTED` or `CLOSED` candidate fails with 400 `terminal_state`.
- [ ] **Optimistic Locking (`status_version`):**
  - If another recruiter modified the candidate record in the interim, submitting with an outdated `status_version` returns 409 `concurrency_conflict`.
- [ ] **Bulk Actions:**
  - Select multiple candidates -> Bulk Shortlist: transitions eligible candidates, skips ineligible without failing batch.
  - Select multiple candidates -> Bulk Reject: requires mandatory reason, updates all selected candidates.

### HP-08 · Email Notifications Idempotency
- [ ] **Application Acknowledgment:** Candidate receives `applied_ack` email upon submission with their reference number and tracking link.
- [ ] **Shortlist Notification:** Candidate receives `shortlisted` email when moved to SHORTLISTED.
- [ ] **Rejection Notification:** Candidate receives professional `rejected` email when moved to REJECTED.
- [ ] **Idempotent Dispatch:** Triggering retry or repeating the task does **not** send duplicate emails due to the `UNIQUE (application_id, type)` database constraint.

---

## 3. QA Sign-Off Matrix

| Test Suite | Coverage Area | Automated Test File | Manual Checklist Item | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Atomic Gate & Concurrency** | Race condition protection, cap=1 oversell prevention | `test_applications.py` | CP-03, CP-04 | **PASS** |
| **Job Roles & JD Generation** | Draft, publish, close, null field omission, LinkedIn copy | `test_jobs.py` | CP-01, CP-02, HP-03, HP-04 | **PASS** |
| **Resume Upload & Storage** | PDF type check, 5MB size limit, pre-signed download URLs | `test_resumes_and_candidates.py` | CP-03, HP-05, HP-06 | **PASS** |
| **Candidate Upsert & Dedup** | Unique email upsert, duplicate role prevention | `test_resumes_and_candidates.py` | CP-03, CP-04 | **PASS** |
| **State Machine & Locking** | Valid forward paths, terminal locking, optimistic locking | `test_hr_endpoints.py`, `test_applications.py` | HP-07 | **PASS** |
| **Notification Idempotency** | UNIQUE constraint, Celery task retry safety, templates | `test_notifications.py` | HP-08 | **PASS** |
| **Public Endpoints API** | Candidate submission, tracking, error contracts | `test_public_endpoints.py` | CP-01, CP-03, CP-05 | **PASS** |
| **HR Endpoints API** | Authentication, manual intake, shortlist, reject | `test_hr_endpoints.py` | HP-01, HP-05, HP-06, HP-07 | **PASS** |
