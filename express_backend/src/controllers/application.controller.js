const BaseController = require('./base.controller');

class ApplicationController extends BaseController {
  constructor(applicationService) {
    super();
    this.applicationService = applicationService;
  }

  apply = async (req, res, next) => {
    try {
      const file = req.file;
      const {
        job_id,
        job_role_id,
        name,
        email,
        phone,
        location,
        current_title,
        total_experience_years,
        skills,
        linkedin_url,
        portfolio_url,
        source
      } = req.body;

      const effectiveJobId = job_id || job_role_id || req.body.jobId;

      if (!file) {
        return this.sendError(res, 'Resume file is required to submit an application', 400, null, 'RESUME_REQUIRED');
      }

      if (!effectiveJobId) {
        return this.sendError(res, 'Job ID is required', 400, null, 'JOB_ID_REQUIRED');
      }

      let parsedSkills = [];
      if (typeof skills === 'string') {
        try {
          parsedSkills = JSON.parse(skills);
        } catch {
          parsedSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(skills)) {
        parsedSkills = skills;
      }

      const candidateData = {
        name,
        email,
        phone,
        location,
        current_title,
        total_experience_years: total_experience_years ? parseFloat(total_experience_years) : 0,
        skills: parsedSkills,
        linkedin_url,
        portfolio_url
      };

      const result = await this.applicationService.applyForJob({
        jobId: effectiveJobId,
        candidateData,
        resumeFile: file,
        source: source || 'portal'
      });

      return res.status(201).json({
        success: true,
        reference_number: result.application.reference_number,
        job_title: result.application.job_title || '',
        message: 'Application submitted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  track = async (req, res, next) => {
    try {
      const { email, reference_number } = req.query;
      if (!email || !reference_number) {
        return this.sendError(res, 'Email and reference number are required', 400);
      }
      const tracking = await this.applicationService.trackByReference(reference_number, email);
      return res.json(tracking);
    } catch (error) {
      next(error);
    }
  };

  listApplications = async (req, res, next) => {
    try {
      const { job_id, status, min_score, search, page, limit } = req.query;
      const result = await this.applicationService.listApplications({
        jobId: job_id,
        status,
        minScore: min_score,
        search,
        page,
        limit
      });
      return this.sendSuccess(res, result, 'Applications retrieved');
    } catch (error) {
      next(error);
    }
  };

  getApplication = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.applicationService.getApplicationDetails(id);
      return this.sendSuccess(res, result, 'Application details retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, reason, remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;

      const result = await this.applicationService.updateStatus(id, status, {
        changedById,
        reason,
        remarks
      });

      return this.sendSuccess(res, result, `Application status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  };

  triggerScreening = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.applicationService.triggerScreening(id);
      return this.sendSuccess(res, result, 'Screening evaluation completed');
    } catch (error) {
      next(error);
    }
  };

  getPipelineMetrics = async (req, res, next) => {
    try {
      const { job_id } = req.query;
      const counts = await this.applicationService.getPipelineMetrics(job_id);
      return this.sendSuccess(res, counts, 'Pipeline stage metrics retrieved');
    } catch (error) {
      next(error);
    }
  };

  shortlist = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      const result = await this.applicationService.updateStatus(id, 'SHORTLISTED', { changedById, remarks });
      return this.sendSuccess(res, result, 'Application shortlisted');
    } catch (error) {
      next(error);
    }
  };

  reject = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason, remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      const result = await this.applicationService.updateStatus(id, 'REJECTED', { changedById, reason, remarks });
      return this.sendSuccess(res, result, 'Application rejected');
    } catch (error) {
      next(error);
    }
  };

  makeOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      const result = await this.applicationService.updateStatus(id, 'OFFER_EXTENDED', { changedById, remarks });
      return this.sendSuccess(res, result, 'Offer extended');
    } catch (error) {
      next(error);
    }
  };

  acceptOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      const result = await this.applicationService.updateStatus(id, 'HIRED', { changedById, remarks });
      return this.sendSuccess(res, result, 'Offer accepted - candidate hired');
    } catch (error) {
      next(error);
    }
  };

  declineOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      const result = await this.applicationService.updateStatus(id, 'REJECTED', { changedById, reason: 'Candidate declined offer', remarks });
      return this.sendSuccess(res, result, 'Offer declined');
    } catch (error) {
      next(error);
    }
  };

  lapseOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      const result = await this.applicationService.updateStatus(id, 'REJECTED', { changedById, reason: 'Offer lapsed', remarks });
      return this.sendSuccess(res, result, 'Offer marked lapsed');
    } catch (error) {
      next(error);
    }
  };

  bulkShortlist = async (req, res, next) => {
    try {
      const { application_ids, remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      let count = 0;
      for (const appId of (application_ids || [])) {
        try {
          await this.applicationService.updateStatus(appId, 'SHORTLISTED', { changedById, remarks });
          count++;
        } catch (e) {}
      }
      return this.sendSuccess(res, { count, total: (application_ids || []).length }, 'Bulk shortlist completed');
    } catch (error) {
      next(error);
    }
  };

  bulkReject = async (req, res, next) => {
    try {
      const { application_ids, reason, remarks } = req.body;
      const changedById = req.hiringUser ? req.hiringUser.id : null;
      let count = 0;
      for (const appId of (application_ids || [])) {
        try {
          await this.applicationService.updateStatus(appId, 'REJECTED', { changedById, reason, remarks });
          count++;
        } catch (e) {}
      }
      return this.sendSuccess(res, { count, total: (application_ids || []).length }, 'Bulk reject completed');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ApplicationController;
