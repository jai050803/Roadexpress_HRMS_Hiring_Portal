const BaseService = require('./base.service');

class OnboardingService extends BaseService {
  constructor(repositories = {}, integrations = {}) {
    super(repositories, integrations);
    this.appRepo = repositories.applicationRepository;
    this.jobRepo = repositories.jobRepository;
    this.candidateRepo = repositories.candidateRepository;
    this.resumeRepo = repositories.resumeRepository;
    this.onboardingIntegration = integrations.onboardingIntegration;
  }

  async handoffHiredCandidate(applicationId) {
    const application = await this.appRepo.findById(applicationId);
    if (!application) {
      const error = new Error('Application not found');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      throw error;
    }

    const job = await this.jobRepo.findById(application.job_id);
    const candidate = await this.candidateRepo.findById(application.candidate_id);
    let resume = null;
    if (application.resume_id) {
      resume = await this.resumeRepo.findById(application.resume_id);
    }

    const result = await this.onboardingIntegration.triggerOnboardingHandoff({
      candidate,
      job,
      application,
      resume
    });

    return {
      success: true,
      applicationId: application.id,
      candidateId: candidate.id,
      candidateName: candidate.name,
      jobTitle: job.title,
      department: job.department,
      handoffStatus: 'COMPLETED',
      details: result
    };
  }
}

module.exports = OnboardingService;
