const BaseService = require('./base.service');

class ApplicationService extends BaseService {
  constructor(repositories = {}, integrations = {}, services = {}) {
    super(repositories, integrations);
    this.appRepo = repositories.applicationRepository;
    this.jobRepo = repositories.jobRepository;
    this.candidateRepo = repositories.candidateRepository;
    this.statusHistoryRepo = repositories.statusHistoryRepository;
    this.onboardingIntegration = integrations.onboardingIntegration;

    this.jobService = services.jobService;
    this.candidateService = services.candidateService;
    this.resumeService = services.resumeService;
    this.screeningService = services.screeningService;
  }

  async applyForJob({ jobId, candidateData, resumeFile, source = 'portal' }) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      const error = new Error('Target job role not found');
      error.statusCode = 404;
      error.code = 'JOB_NOT_FOUND';
      throw error;
    }

    const stillOpen = this.jobService.calculateStillOpen(job);
    if (!stillOpen) {
      const error = new Error('This job role is currently closed or has reached maximum application limit');
      error.statusCode = 400;
      error.code = 'JOB_APPLICATIONS_CLOSED';
      throw error;
    }

    const candidate = await this.candidateService.upsertCandidate(candidateData);

    const existingApp = await this.appRepo.findByJobAndCandidate(job.id, candidate.id);
    if (existingApp) {
      const error = new Error('You have already applied for this position with this email address');
      error.statusCode = 409;
      error.code = 'APPLICATION_EXISTS';
      throw error;
    }

    const resumeResult = await this.resumeService.uploadAndProcessResume({
      file: resumeFile,
      candidateId: candidate.id,
      jobRoleId: job.id
    });

    const application = await this.appRepo.createApplication({
      job_id: job.id,
      candidate_id: candidate.id,
      resume_id: resumeResult.resume.id,
      source: source || 'portal',
      status: 'APPLIED'
    });

    await this.jobRepo.incrementApplicationsCount(job.id);

    await this.statusHistoryRepo.recordStatusChange({
      applicationId: application.id,
      oldStatus: null,
      newStatus: 'APPLIED',
      changedByType: 'system',
      remarks: `Applied via ${source}`
    });

    let screeningResult = null;
    try {
      screeningResult = await this.screeningService.evaluateAndSave(
        application,
        job,
        resumeResult.resume
      );
      const newStatus = screeningResult ? 'SCREENED' : 'APPLIED';
      await this.appRepo.updateStatus(application.id, newStatus, screeningResult.score);
      application.status = newStatus;
      application.current_status = newStatus;
      application.match_score = screeningResult.score;

      if (newStatus === 'SCREENED') {
        await this.statusHistoryRepo.recordStatusChange({
          applicationId: application.id,
          oldStatus: 'APPLIED',
          newStatus: 'SCREENED',
          changedByType: 'system',
          remarks: `Automated AI screening completed (${screeningResult.score}/100)`
        });
      }
    } catch (err) {
      console.warn('Initial screening evaluation encountered an issue:', err.message);
    }

    return {
      application,
      candidate,
      resume: resumeResult.resume,
      screening: screeningResult ? screeningResult.screening : null
    };
  }

  async updateStatus(id, newStatus, { changedById = null, reason = null, remarks = null } = {}) {
    const validStatuses = [
      'APPLIED',
      'SCREENING',
      'SHORTLISTED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'OFFER_EXTENDED',
      'HIRED',
      'REJECTED'
    ];

    const normalizedStatus = newStatus.toUpperCase();
    if (!validStatuses.includes(normalizedStatus)) {
      const error = new Error(`Invalid status transition. Permitted: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const application = await this.appRepo.findById(id);
    if (!application) {
      const error = new Error('Application not found');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      throw error;
    }

    const oldStatus = application.status;
    const updated = await this.appRepo.updateStatus(id, normalizedStatus);

    await this.statusHistoryRepo.recordStatusChange({
      applicationId: id,
      oldStatus,
      newStatus: normalizedStatus,
      changedById,
      changedByType: changedById ? 'hr' : 'system',
      reason,
      remarks
    });

    if (normalizedStatus === 'HIRED' && this.onboardingIntegration) {
      const job = await this.jobRepo.findById(application.job_id);
      const candidate = await this.candidateRepo.findById(application.candidate_id);
      await this.onboardingIntegration.triggerOnboardingHandoff({
        candidate,
        job,
        application: updated,
        resume: { file_path: application.resume_url, original_filename: application.resume_filename }
      });
    }

    return updated;
  }

  async listApplications({ jobId = null, status = null, minScore = null, search = null, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [applications, total] = await Promise.all([
      this.appRepo.listApplications({ jobId, status, minScore, search, limit: limitNum, offset }),
      this.appRepo.countApplications({ jobId, status, minScore, search })
    ]);

    return {
      applications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  async getApplicationDetails(id) {
    const app = await this.appRepo.findById(id);
    if (!app) {
      const error = new Error('Application not found');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      throw error;
    }

    const statusHistory = await this.statusHistoryRepo.findByApplicationId(id);

    const candidate = {
      id: app.candidate_id,
      name: app.candidate_name,
      email: app.candidate_email,
      phone: app.candidate_phone,
      location: app.candidate_location,
      current_title: app.candidate_title,
      total_experience_years: app.candidate_experience ? parseFloat(app.candidate_experience) : 0,
      skills: app.candidate_skills || []
    };

    const resume = app.resume_id ? {
      id: app.resume_id,
      application_id: app.id,
      candidate_id: app.candidate_id,
      original_filename: app.resume_filename,
      file_url: app.resume_url,
      parsed_json: app.resume_parsed_data
    } : null;

    const screeningResult = (app.screening_score !== null && app.screening_score !== undefined) ? {
      id: app.id,
      score: Number(app.screening_score),
      overall_score: Number(app.screening_score),
      matched_skills: app.screening_matched_skills || [],
      missing_skills: app.screening_missing_skills || [],
      llm_rationale: app.screening_rationale,
      summary: app.screening_rationale,
      hard_filter_passed: app.screening_hard_filter_passed !== null ? Boolean(app.screening_hard_filter_passed) : true
    } : null;

    const job = {
      id: app.job_id,
      title: app.job_title,
      department: app.job_department || app.department,
      location: app.job_location,
      salary_band: app.job_salary_band
    };

    return {
      ...app,
      job_role_id: app.job_id,
      department: app.job_department || app.department,
      status: app.current_status || app.status,
      current_status: app.current_status || app.status,
      screening_score: app.screening_score !== null ? Number(app.screening_score) : null,
      match_score: app.match_score !== null ? parseFloat(app.match_score) : null,
      candidate,
      resume,
      screening_result: screeningResult,
      job,
      status_history: statusHistory,
      timeline: statusHistory
    };
  }

  async getPipelineMetrics(jobId = null) {
    return await this.appRepo.getPipelineCounts(jobId);
  }

  async triggerScreening(applicationId) {
    const application = await this.appRepo.findById(applicationId);
    if (!application) {
      const error = new Error('Application not found');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      throw error;
    }

    const job = await this.jobRepo.findById(application.job_id);
    const resume = await this.resumeService.getResumeById(application.resume_id);

    const result = await this.screeningService.evaluateAndSave(application, job, resume);
    const newStatus = application.status === 'APPLIED' ? 'SCREENED' : application.status;
    await this.appRepo.updateStatus(application.id, newStatus, result.score);

    if (application.status === 'APPLIED') {
      await this.statusHistoryRepo.recordStatusChange({
        applicationId: application.id,
        oldStatus: 'APPLIED',
        newStatus: 'SCREENED',
        changedByType: 'system',
        remarks: `Automated AI screening completed (${result.score}/100)`
      });
    }

    return result.screening;
  }

  async trackByReference(referenceNumber, email) {
    if (!referenceNumber || !email) {
      const error = new Error('Reference number and candidate email are required');
      error.statusCode = 400;
      throw error;
    }

    const app = await this.appRepo.findByReferenceNumber(referenceNumber.trim());
    if (!app || app.candidate_email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      const error = new Error('No application found matching the provided details');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const statusMapping = {
      APPLIED: { label: 'Application Received', stage: 1 },
      SCREENED: { label: 'Under Review', stage: 2 },
      SCREENING: { label: 'Under Review', stage: 2 },
      SHORTLISTED: { label: 'Shortlisted - Interview Details Sent', stage: 3 },
      INTERVIEW_SCHEDULED: { label: 'Shortlisted - Interview Details Sent', stage: 3 },
      INTERVIEWED: { label: 'Under Review', stage: 2 },
      INTERVIEW_COMPLETED: { label: 'Under Review', stage: 2 },
      OFFERED: { label: 'Offer Extended', stage: 3 },
      OFFER_EXTENDED: { label: 'Offer Extended', stage: 3 },
      OFFER_ACCEPTED: { label: 'Welcome to Road Express', stage: 4 },
      HIRED: { label: 'Welcome to Road Express', stage: 4 },
      OFFER_DECLINED: { label: 'Not Selected', stage: 4 },
      OFFER_LAPSED: { label: 'Not Selected', stage: 4 },
      REJECTED: { label: 'Not Selected', stage: 4 },
      CLOSED: { label: 'Not Selected', stage: 4 }
    };

    const currentStatus = app.current_status || app.status || 'APPLIED';
    const meta = statusMapping[currentStatus] || { label: 'Under Review', stage: 2 };

    return {
      reference_number: app.reference_number,
      job_title: app.job_title,
      applied_at: app.created_at,
      status_label: meta.label,
      status_stage: meta.stage
    };
  }
}

module.exports = ApplicationService;
