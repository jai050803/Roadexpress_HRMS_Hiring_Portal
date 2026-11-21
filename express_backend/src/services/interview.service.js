const BaseService = require('./base.service');

class InterviewService extends BaseService {
  constructor(repositories = {}, integrations = {}, services = {}) {
    super(repositories, integrations);
    this.interviewRepo = repositories.interviewRepository;
    this.feedbackRepo = repositories.feedbackRepository;
    this.appRepo = repositories.applicationRepository;
    this.statusHistoryRepo = repositories.statusHistoryRepository;
  }

  async scheduleInterview(data, hrUserId = null) {
    const application = await this.appRepo.findById(data.application_id);
    if (!application) {
      const error = new Error('Application not found');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      throw error;
    }

    const interview = await this.interviewRepo.createInterview({
      application_id: data.application_id,
      job_role_id: application.job_id,
      round_number: data.round_number || 1,
      round_name: data.round_name || 'Interview Round',
      scheduled_at: data.scheduled_at,
      duration_minutes: data.duration_minutes || 45,
      mode: data.mode || 'video',
      location: data.location || null,
      meeting_link: data.meeting_link || null,
      interviewer_id: data.interviewer_id || null,
      interviewer_name: data.interviewer_name || null,
      interviewer_email: data.interviewer_email || null,
      interviewer_ids: data.interviewer_ids || [],
      status: 'scheduled',
      hr_notes: data.hr_notes || null,
      created_by_id: hrUserId
    });

    if (application.status !== 'INTERVIEW_SCHEDULED') {
      const oldStatus = application.status;
      await this.appRepo.updateStatus(application.id, 'INTERVIEW_SCHEDULED');
      await this.statusHistoryRepo.recordStatusChange({
        applicationId: application.id,
        oldStatus,
        newStatus: 'INTERVIEW_SCHEDULED',
        changedById: hrUserId,
        changedByType: 'hr',
        remarks: `Interview round scheduled for ${data.scheduled_at}`
      });
    }

    return await this.interviewRepo.findById(interview.id);
  }

  async rescheduleInterview(id, { scheduled_at, meeting_link, hr_notes }, hrUserId = null) {
    const existing = await this.interviewRepo.findById(id);
    if (!existing) {
      const error = new Error('Interview not found');
      error.statusCode = 404;
      error.code = 'INTERVIEW_NOT_FOUND';
      throw error;
    }

    const updated = await this.interviewRepo.reschedule(id, {
      scheduled_at,
      meeting_link,
      hr_notes
    });

    await this.statusHistoryRepo.recordStatusChange({
      applicationId: existing.application_id,
      oldStatus: 'INTERVIEW_SCHEDULED',
      newStatus: 'INTERVIEW_SCHEDULED',
      changedById: hrUserId,
      changedByType: 'hr',
      remarks: `Interview rescheduled to ${scheduled_at}`
    });

    return await this.interviewRepo.findById(id);
  }

  async cancelInterview(id, cancellationReason, hrUserId = null) {
    const existing = await this.interviewRepo.findById(id);
    if (!existing) {
      const error = new Error('Interview not found');
      error.statusCode = 404;
      error.code = 'INTERVIEW_NOT_FOUND';
      throw error;
    }

    const updated = await this.interviewRepo.updateStatus(id, 'cancelled', cancellationReason);

    await this.statusHistoryRepo.recordStatusChange({
      applicationId: existing.application_id,
      oldStatus: 'INTERVIEW_SCHEDULED',
      newStatus: 'INTERVIEW_SCHEDULED',
      changedById: hrUserId,
      changedByType: 'hr',
      reason: cancellationReason,
      remarks: `Interview cancelled: ${cancellationReason}`
    });

    return updated;
  }

  async markCompleted(id, hrUserId = null) {
    const existing = await this.interviewRepo.findById(id);
    if (!existing) {
      const error = new Error('Interview not found');
      error.statusCode = 404;
      error.code = 'INTERVIEW_NOT_FOUND';
      throw error;
    }

    const updated = await this.interviewRepo.updateStatus(id, 'completed');

    await this.appRepo.updateStatus(existing.application_id, 'INTERVIEW_COMPLETED');
    await this.statusHistoryRepo.recordStatusChange({
      applicationId: existing.application_id,
      oldStatus: 'INTERVIEW_SCHEDULED',
      newStatus: 'INTERVIEW_COMPLETED',
      changedById: hrUserId,
      changedByType: 'hr',
      remarks: 'Interview round marked as completed'
    });

    return updated;
  }

  async markNoShow(id, hrUserId = null) {
    const existing = await this.interviewRepo.findById(id);
    if (!existing) {
      const error = new Error('Interview not found');
      error.statusCode = 404;
      error.code = 'INTERVIEW_NOT_FOUND';
      throw error;
    }

    const updated = await this.interviewRepo.updateStatus(id, 'no_show');

    await this.statusHistoryRepo.recordStatusChange({
      applicationId: existing.application_id,
      oldStatus: 'INTERVIEW_SCHEDULED',
      newStatus: 'INTERVIEW_SCHEDULED',
      changedById: hrUserId,
      changedByType: 'hr',
      remarks: 'Candidate marked as no-show for scheduled interview'
    });

    return updated;
  }

  async submitFeedback(interviewId, feedbackData, hrUserId = null) {
    const existing = await this.interviewRepo.findById(interviewId);
    if (!existing) {
      const error = new Error('Interview not found');
      error.statusCode = 404;
      error.code = 'INTERVIEW_NOT_FOUND';
      throw error;
    }

    const feedback = await this.feedbackRepo.submitFeedback({
      interview_id: interviewId,
      submitted_by: hrUserId,
      interviewer_id: hrUserId,
      rating: feedbackData.rating || feedbackData.overall_rating,
      overall_rating: feedbackData.overall_rating || feedbackData.rating,
      technical_skills: feedbackData.technical_skills || feedbackData.technical_rating,
      technical_rating: feedbackData.technical_rating || feedbackData.technical_skills,
      communication_skills: feedbackData.communication_skills || feedbackData.communication_rating,
      communication_rating: feedbackData.communication_rating || feedbackData.communication_skills,
      problem_solving: feedbackData.problem_solving,
      culture_rating: feedbackData.culture_rating,
      recommendation: feedbackData.recommendation || feedbackData.decision,
      decision: feedbackData.decision || feedbackData.recommendation,
      comments: feedbackData.comments || feedbackData.additional_notes,
      strengths: feedbackData.strengths,
      concerns: feedbackData.concerns,
      additional_notes: feedbackData.additional_notes || feedbackData.comments
    });

    return feedback;
  }

  async getTodayInterviews() {
    return await this.interviewRepo.listTodayInterviews();
  }

  async listInterviews(filters = {}) {
    return await this.interviewRepo.listInterviews(filters);
  }

  async getInterviewById(id) {
    const interview = await this.interviewRepo.findById(id);
    if (!interview) {
      const error = new Error('Interview not found');
      error.statusCode = 404;
      error.code = 'INTERVIEW_NOT_FOUND';
      throw error;
    }
    return interview;
  }

  async getApplicationInterviews(applicationId) {
    return await this.interviewRepo.listByApplicationId(applicationId);
  }
}

module.exports = InterviewService;
