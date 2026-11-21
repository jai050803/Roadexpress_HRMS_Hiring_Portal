const BaseController = require('./base.controller');

class JobController extends BaseController {
  constructor(jobService) {
    super();
    this.jobService = jobService;
  }

  listPublished = async (req, res, next) => {
    try {
      const { department, work_mode, limit, offset } = req.query;
      const jobs = await this.jobService.listPublishedJobs({
        department,
        work_mode,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      });
      return this.sendSuccess(res, jobs, 'Published jobs retrieved');
    } catch (error) {
      next(error);
    }
  };

  listAll = async (req, res, next) => {
    try {
      const { status, department, limit, offset } = req.query;
      const jobs = await this.jobService.listAllJobs({
        status,
        department,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0
      });
      return this.sendSuccess(res, jobs, 'All jobs retrieved');
    } catch (error) {
      next(error);
    }
  };

  getJob = async (req, res, next) => {
    try {
      const { id } = req.params;
      const isHR = Boolean(req.hiringUser);
      const job = await this.jobService.getJobById(id, isHR);
      return this.sendSuccess(res, job, 'Job details retrieved');
    } catch (error) {
      next(error);
    }
  };

  createJob = async (req, res, next) => {
    try {
      const createdById = req.hiringUser ? req.hiringUser.id : null;
      const job = await this.jobService.createJob(req.body, createdById);
      return this.sendCreated(res, job, 'Job role created successfully in draft mode');
    } catch (error) {
      next(error);
    }
  };

  updateDraftJob = async (req, res, next) => {
    try {
      const { id } = req.params;
      const job = await this.jobService.updateDraftJob(id, req.body);
      return this.sendSuccess(res, job, 'Job role updated successfully');
    } catch (error) {
      next(error);
    }
  };

  publishJob = async (req, res, next) => {
    try {
      const { id } = req.params;
      const job = await this.jobService.publishJob(id);
      return this.sendSuccess(res, job, 'Job role published successfully');
    } catch (error) {
      next(error);
    }
  };

  closeJob = async (req, res, next) => {
    try {
      const { id } = req.params;
      const job = await this.jobService.closeJob(id);
      return this.sendSuccess(res, job, 'Job role closed successfully');
    } catch (error) {
      next(error);
    }
  };

  markLinkedInPosted = async (req, res, next) => {
    try {
      const { id } = req.params;
      const job = await this.jobService.markLinkedInPosted(id);
      return this.sendSuccess(res, job, 'Job marked as posted on LinkedIn');
    } catch (error) {
      next(error);
    }
  };

  previewContent = async (req, res, next) => {
    try {
      const preview = this.jobService.previewContent(req.body);
      return this.sendSuccess(res, preview, 'JD and LinkedIn content preview generated');
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req, res, next) => {
    try {
      const metrics = await this.jobService.getMetrics();
      return this.sendSuccess(res, metrics, 'Job metrics retrieved');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = JobController;
