const BaseController = require('./base.controller');

class InterviewController extends BaseController {
  constructor(interviewService, onboardingService) {
    super();
    this.interviewService = interviewService;
    this.onboardingService = onboardingService;
  }

  scheduleInterview = async (req, res, next) => {
    try {
      const hrUserId = req.hiringUser ? req.hiringUser.id : null;
      const interview = await this.interviewService.scheduleInterview(req.body, hrUserId);
      return this.sendCreated(res, interview, 'Interview scheduled successfully');
    } catch (error) {
      next(error);
    }
  };

  getTodayInterviews = async (req, res, next) => {
    try {
      const interviews = await this.interviewService.getTodayInterviews();
      return this.sendSuccess(res, interviews, 'Today interviews retrieved');
    } catch (error) {
      next(error);
    }
  };

  listInterviews = async (req, res, next) => {
    try {
      const { job_role_id, status, date_from, date_to, interviewer_id, limit, offset } = req.query;
      const interviews = await this.interviewService.listInterviews({
        jobRoleId: job_role_id,
        status,
        dateFrom: date_from,
        dateTo: date_to,
        interviewerId: interviewer_id,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      });
      return this.sendSuccess(res, interviews, 'Interviews retrieved');
    } catch (error) {
      next(error);
    }
  };

  getInterview = async (req, res, next) => {
    try {
      const { id } = req.params;
      const interview = await this.interviewService.getInterviewById(id);
      return this.sendSuccess(res, interview, 'Interview details retrieved');
    } catch (error) {
      next(error);
    }
  };

  reschedule = async (req, res, next) => {
    try {
      const { id } = req.params;
      const hrUserId = req.hiringUser ? req.hiringUser.id : null;
      const interview = await this.interviewService.rescheduleInterview(id, req.body, hrUserId);
      return this.sendSuccess(res, interview, 'Interview rescheduled successfully');
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;
      const hrUserId = req.hiringUser ? req.hiringUser.id : null;
      const interview = await this.interviewService.cancelInterview(id, cancellation_reason, hrUserId);
      return this.sendSuccess(res, interview, 'Interview cancelled');
    } catch (error) {
      next(error);
    }
  };

  markCompleted = async (req, res, next) => {
    try {
      const { id } = req.params;
      const hrUserId = req.hiringUser ? req.hiringUser.id : null;
      const interview = await this.interviewService.markCompleted(id, hrUserId);
      return this.sendSuccess(res, interview, 'Interview marked as completed');
    } catch (error) {
      next(error);
    }
  };

  markNoShow = async (req, res, next) => {
    try {
      const { id } = req.params;
      const hrUserId = req.hiringUser ? req.hiringUser.id : null;
      const interview = await this.interviewService.markNoShow(id, hrUserId);
      return this.sendSuccess(res, interview, 'Candidate marked as no-show');
    } catch (error) {
      next(error);
    }
  };

  submitFeedback = async (req, res, next) => {
    try {
      const { id } = req.params;
      const hrUserId = req.hiringUser ? req.hiringUser.id : null;
      const feedback = await this.interviewService.submitFeedback(id, req.body, hrUserId);
      return this.sendCreated(res, feedback, 'Interview feedback submitted');
    } catch (error) {
      next(error);
    }
  };

  getApplicationInterviews = async (req, res, next) => {
    try {
      const { id } = req.params;
      const interviews = await this.interviewService.getApplicationInterviews(id);
      return this.sendSuccess(res, interviews, 'Application interviews retrieved');
    } catch (error) {
      next(error);
    }
  };

  handoffCandidate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.onboardingService.handoffHiredCandidate(id);
      return this.sendSuccess(res, result, 'Hired candidate successfully exported to HRMS onboarding');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = InterviewController;
