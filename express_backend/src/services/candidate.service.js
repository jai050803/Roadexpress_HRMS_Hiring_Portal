const BaseService = require('./base.service');

class CandidateService extends BaseService {
  constructor(repositories = {}, integrations = {}) {
    super(repositories, integrations);
    this.candidateRepo = repositories.candidateRepository;
  }

  async upsertCandidate(data) {
    if (!data.email) {
      const error = new Error('Candidate email is required');
      error.statusCode = 400;
      error.code = 'EMAIL_REQUIRED';
      throw error;
    }

    const candidate = await this.candidateRepo.upsertCandidate(data);
    return candidate;
  }

  async getCandidateById(id) {
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) {
      const error = new Error('Candidate not found');
      error.statusCode = 404;
      error.code = 'CANDIDATE_NOT_FOUND';
      throw error;
    }
    return candidate;
  }

  async getCandidateByEmail(email) {
    if (!email) return null;
    return await this.candidateRepo.findByEmail(email);
  }

  async listCandidates({ search = null, skill = null, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [candidates, total] = await Promise.all([
      this.candidateRepo.listCandidates({ search, skill, limit: limitNum, offset }),
      this.candidateRepo.countCandidates({ search, skill })
    ]);

    return {
      candidates,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }
}

module.exports = CandidateService;
