const BaseService = require('./base.service');

class JobService extends BaseService {
  constructor(repositories = {}, integrations = {}) {
    super(repositories, integrations);
    this.jobRepo = repositories.jobRepository;
    this.masterData = integrations.masterDataIntegration;
  }

  calculateStillOpen(job) {
    if (!job || job.status !== 'published') {
      return false;
    }
    if (job.application_deadline) {
      const deadline = new Date(job.application_deadline);
      if (deadline < new Date()) {
        return false;
      }
    }
    if (job.max_applications && job.applications_count >= job.max_applications) {
      return false;
    }
    return true;
  }

  generateJdText(data) {
    const title = data.title?.trim() || 'Job Opening';
    const dept = data.department?.trim() || 'Operations';
    const sections = [];

    sections.push(`# ${title}\n**Department:** ${dept}`);

    const meta = [];
    if (data.location) meta.push(`**Location:** ${data.location.trim()}`);
    if (data.work_mode) meta.push(`**Work Mode:** ${data.work_mode.charAt(0).toUpperCase() + data.work_mode.slice(1)}`);
    if (data.employment_type) meta.push(`**Employment Type:** ${data.employment_type.replace('_', ' ').toUpperCase()}`);
    if (data.salary_band) meta.push(`**Salary Band:** ${data.salary_band.trim()}`);
    if (meta.length > 0) sections.push(meta.join('\n'));

    sections.push(
      '### About Road Express Freight\nRoad Express Freight is India\'s premier tech-enabled surface freight and linehaul logistics network. Operating across 500+ commercial hubs with a 99.4% on-time linehaul SLA and moving over 12,000 metric tonnes daily, we build mission-critical logistics software, supply chain infrastructure, and operational discipline that power the nation\'s commerce.'
    );

    if (data.responsibilities_text?.trim()) {
      sections.push(`### Key Responsibilities\n${data.responsibilities_text.trim()}`);
    }

    const reqs = [];
    if (data.min_experience_years !== undefined && data.min_experience_years !== null) {
      reqs.push(`- Minimum ${data.min_experience_years} years of relevant domain experience`);
    }
    if (data.education_qualification?.trim()) {
      reqs.push(`- Educational Background: ${data.education_qualification.trim()}`);
    }
    if (Array.isArray(data.required_skills) && data.required_skills.length > 0) {
      reqs.push(`- Core Competencies: ${data.required_skills.join(', ')}`);
    }

    if (reqs.length > 0) {
      sections.push(`### Qualifications & Requirements\n${reqs.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  generateLinkedInCopy(data, portalUrl = 'https://careers.roadexpress.com') {
    const title = data.title?.trim() || 'Professional';
    const dept = data.department?.trim() || 'Logistics Operations';
    const location = data.location?.trim() || 'Pan-India';
    const workMode = data.work_mode
      ? data.work_mode.charAt(0).toUpperCase() + data.work_mode.slice(1).toLowerCase()
      : 'Onsite';
    const empType = data.employment_type
      ? data.employment_type.replace('_', ' ').toUpperCase()
      : 'FULL TIME';
    const salaryBand = data.salary_band?.trim();
    const cleanPortal = portalUrl.replace(/\/+$/, '');
    const jobId = data.id || ':id';
    const applyLink = `${cleanPortal}/jobs/${jobId}`;

    const blocks = [];

    // 1. Headline
    blocks.push(`Hiring: ${title} in ${dept} at Road Express Freight`);

    // 2. Company Context & Overview
    blocks.push(
      `Road Express Freight is looking for a driven ${title} to join our ${dept} team in ${location} (${workMode}).\n\n` +
      `As India's leading tech-enabled surface freight and linehaul logistics network, Road Express moves over 12,000 metric tonnes daily across 500+ commercial hubs nationwide with a 99.4% on-time linehaul SLA. In this role, you will directly influence supply chain velocity, linehaul movement, and operational excellence at scale.`
    );

    // 3. Position Snapshot
    const snapshot = [
      'Position Snapshot:',
      `- Role: ${title}`,
      `- Department: ${dept}`,
      `- Location: ${location} (${workMode})`,
      `- Employment Type: ${empType}`
    ];
    if (salaryBand) {
      snapshot.push(`- Compensation Band: ${salaryBand}`);
    }
    blocks.push(snapshot.join('\n'));

    // 4. Key Responsibilities
    if (data.responsibilities_text?.trim()) {
      const respBullets = data.responsibilities_text
        .split('\n')
        .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)
        .slice(0, 5)
        .map((b) => `- ${b}`);

      if (respBullets.length > 0) {
        blocks.push(`Key Responsibilities:\n${respBullets.join('\n')}`);
      }
    }

    // 5. Candidate Profile & Qualifications
    const reqLines = [];
    if (data.min_experience_years !== undefined && data.min_experience_years !== null) {
      reqLines.push(
        data.min_experience_years > 0
          ? `- Experience: Minimum ${data.min_experience_years} year(s) of relevant domain experience`
          : `- Experience: Open to early career & fresh talent with strong fundamentals (0+ years)`
      );
    }
    if (Array.isArray(data.required_skills) && data.required_skills.length > 0) {
      const skills = data.required_skills.filter(Boolean);
      if (skills.length > 0) {
        reqLines.push(`- Core Competencies: ${skills.join(', ')}`);
      }
    }
    if (data.education_qualification?.trim()) {
      reqLines.push(`- Education: ${data.education_qualification.trim()}`);
    }

    if (reqLines.length > 0) {
      blocks.push(`Candidate Profile & Qualifications:\n${reqLines.join('\n')}`);
    }

    // 6. Why Join Road Express Freight
    blocks.push(
      `Why Join Road Express Freight:\n` +
      `- Build and scale mission-critical logistics systems powering national commerce\n` +
      `- Fast-paced, merit-driven culture with high ownership and rapid career growth\n` +
      `- Work alongside elite engineering and operations leaders transforming freight mobility`
    );

    // 7. Call To Action
    blocks.push(
      `Ready to shape the future of linehaul logistics?\n` +
      `Review full role details and submit your application directly on our verified careers portal:\n\n` +
      `Apply here: ${applyLink}`
    );

    // 8. Referral Callout
    blocks.push(
      `Know someone who would thrive in this role? Please tag them or share this announcement.`
    );

    return blocks.join('\n\n');
  }

  async listPublishedJobs(filters = {}) {
    const jobs = await this.jobRepo.listPublished(filters);
    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      work_mode: job.work_mode,
      employment_type: job.employment_type,
      education_qualification: job.education_qualification,
      min_experience_years: job.min_experience_years,
      required_skills: job.required_skills,
      responsibilities_text: job.responsibilities_text,
      salary_band: job.salary_band,
      jd_text: job.jd_text,
      application_deadline: job.application_deadline,
      applications_still_open: this.calculateStillOpen(job),
      created_at: job.created_at
    }));
  }

  async listAllJobs(filters = {}) {
    const jobs = await this.jobRepo.listAll(filters);
    return jobs.map((job) => ({
      ...job,
      applications_still_open: this.calculateStillOpen(job)
    }));
  }

  async getJobById(id, isHR = false) {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      const error = new Error('Job role not found');
      error.statusCode = 404;
      error.code = 'JOB_NOT_FOUND';
      throw error;
    }

    if (!isHR && job.status !== 'published') {
      const error = new Error('Job role is not available or closed');
      error.statusCode = 404;
      error.code = 'JOB_UNAVAILABLE';
      throw error;
    }

    const stillOpen = this.calculateStillOpen(job);

    if (!isHR) {
      return {
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        work_mode: job.work_mode,
        employment_type: job.employment_type,
        education_qualification: job.education_qualification,
        min_experience_years: job.min_experience_years,
        required_skills: job.required_skills,
        responsibilities_text: job.responsibilities_text,
        salary_band: job.salary_band,
        jd_text: job.jd_text,
        application_deadline: job.application_deadline,
        applications_still_open: stillOpen,
        created_at: job.created_at
      };
    }

    return {
      ...job,
      applications_still_open: stillOpen
    };
  }

  async createJob(data, createdById = null) {
    const validDepts = await this.masterData.getDepartments();
    if (Array.isArray(validDepts) && validDepts.length > 0 && !validDepts.includes(data.department)) {
      console.warn(`Creating job for non-standard department: ${data.department}`);
    }

    const jobData = {
      title: data.title.trim(),
      department: data.department.trim(),
      location: data.location ? data.location.trim() : null,
      employment_type: data.employment_type || 'full_time',
      work_mode: data.work_mode || 'onsite',
      education_qualification: data.education_qualification ? data.education_qualification.trim() : null,
      min_experience_years: data.min_experience_years !== undefined ? data.min_experience_years : 0,
      required_skills: data.required_skills || [],
      responsibilities_text: data.responsibilities_text ? data.responsibilities_text.trim() : null,
      salary_band: data.salary_band ? data.salary_band.trim() : null,
      application_deadline: data.application_deadline || null,
      max_applications: data.max_applications || null,
      status: 'draft',
      created_by_id: createdById
    };

    jobData.jd_text = this.generateJdText(jobData);
    jobData.linkedin_post_copy = this.generateLinkedInCopy(jobData);

    const created = await this.jobRepo.createJob(jobData);
    return {
      ...created,
      applications_still_open: false
    };
  }

  async updateDraftJob(id, updateData) {
    const existing = await this.jobRepo.findById(id);
    if (!existing) {
      const error = new Error('Job role not found');
      error.statusCode = 404;
      error.code = 'JOB_NOT_FOUND';
      throw error;
    }

    if (existing.status !== 'draft') {
      const error = new Error('Only draft job roles can be modified. Published or closed roles are immutable');
      error.statusCode = 400;
      error.code = 'JOB_IMMUTABLE';
      throw error;
    }

    const payload = { ...updateData };
    const merged = { ...existing, ...payload };
    payload.jd_text = this.generateJdText(merged);
    payload.linkedin_post_copy = this.generateLinkedInCopy(merged);

    const updated = await this.jobRepo.updateJob(id, payload);
    return {
      ...updated,
      applications_still_open: false
    };
  }

  async publishJob(id) {
    const existing = await this.jobRepo.findById(id);
    if (!existing) {
      const error = new Error('Job role not found');
      error.statusCode = 404;
      error.code = 'JOB_NOT_FOUND';
      throw error;
    }

    if (existing.status === 'published') {
      return {
        ...existing,
        applications_still_open: this.calculateStillOpen(existing)
      };
    }

    const jdText = existing.jd_text || this.generateJdText(existing);
    const linkedinCopy = existing.linkedin_post_copy || this.generateLinkedInCopy(existing);

    await this.jobRepo.updateJob(id, {
      jd_text: jdText,
      linkedin_post_copy: linkedinCopy,
      status: 'published'
    });

    const published = await this.jobRepo.findById(id);
    return {
      ...published,
      applications_still_open: this.calculateStillOpen(published)
    };
  }

  async closeJob(id) {
    const existing = await this.jobRepo.findById(id);
    if (!existing) {
      const error = new Error('Job role not found');
      error.statusCode = 404;
      error.code = 'JOB_NOT_FOUND';
      throw error;
    }

    const closed = await this.jobRepo.updateStatus(id, 'closed');
    return {
      ...closed,
      applications_still_open: false
    };
  }

  async markLinkedInPosted(id) {
    const existing = await this.jobRepo.findById(id);
    if (!existing) {
      const error = new Error('Job role not found');
      error.statusCode = 404;
      error.code = 'JOB_NOT_FOUND';
      throw error;
    }

    const updated = await this.jobRepo.markLinkedInPosted(id);
    return {
      ...updated,
      applications_still_open: this.calculateStillOpen(updated)
    };
  }

  async getMetrics() {
    return await this.jobRepo.getJobMetrics();
  }

  previewContent(data) {
    const jdText = this.generateJdText(data);
    const linkedinCopy = this.generateLinkedInCopy(data);
    return {
      jd_text: jdText,
      linkedin_post_copy: linkedinCopy
    };
  }
}

module.exports = JobService;
