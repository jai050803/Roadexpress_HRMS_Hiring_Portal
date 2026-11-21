class OnboardingIntegration {
  constructor(options = {}) {
    this.onHiredCallback = options.onHired || null;
    this.eventEmitter = options.eventEmitter || null;
  }

  async triggerOnboardingHandoff(hiringData) {
    const { candidate, job, application, resume } = hiringData;

    const employeeDraftPayload = {
      source: 'ROADEXPRESS_HIRING_PORTAL',
      candidateId: candidate.id,
      applicationId: application.id,
      personalInfo: {
        fullName: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location
      },
      employmentDetails: {
        jobTitle: job.title,
        department: job.department,
        branch: job.location,
        jobType: job.job_type,
        offeredSalary: application.offered_salary || job.max_salary,
        hiredDate: new Date().toISOString()
      },
      documents: {
        resumeFilePath: resume ? resume.file_path : null,
        resumeOriginalName: resume ? resume.original_filename : null
      },
      screeningScore: application.match_score
    };

    if (this.eventEmitter && typeof this.eventEmitter.emit === 'function') {
      this.eventEmitter.emit('hiring.candidate_hired', employeeDraftPayload);
    }

    if (typeof this.onHiredCallback === 'function') {
      const result = await this.onHiredCallback(employeeDraftPayload);
      return {
        handedOff: true,
        externalResult: result,
        payload: employeeDraftPayload
      };
    }

    return {
      handedOff: true,
      mode: 'standalone_logged',
      payload: employeeDraftPayload
    };
  }
}

module.exports = OnboardingIntegration;
