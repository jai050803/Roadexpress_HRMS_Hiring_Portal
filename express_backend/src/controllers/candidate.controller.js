const BaseController = require('./base.controller');

class CandidateController extends BaseController {
  constructor(candidateService) {
    super();
    this.candidateService = candidateService;
  }

  listCandidates = async (req, res, next) => {
    try {
      const { search, skill, page, limit } = req.query;
      const result = await this.candidateService.listCandidates({
        search,
        skill,
        page,
        limit
      });
      return this.sendSuccess(res, result, 'Candidates retrieved');
    } catch (error) {
      next(error);
    }
  };

  getCandidate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const candidate = await this.candidateService.getCandidateById(id);
      return this.sendSuccess(res, candidate, 'Candidate profile retrieved');
    } catch (error) {
      next(error);
    }
  };

  upsertCandidate = async (req, res, next) => {
    try {
      const candidate = await this.candidateService.upsertCandidate(req.body);
      return this.sendSuccess(res, candidate, 'Candidate registered successfully');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CandidateController;
