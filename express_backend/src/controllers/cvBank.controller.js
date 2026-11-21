const BaseController = require('./base.controller');

class CVBankController extends BaseController {
  constructor(applicationRepository, storageIntegration) {
    super();
    this.appRepo = applicationRepository;
    this.storage = storageIntegration;
  }

  search = async (req, res, next) => {
    try {
      const { job_role_id, status, min_score, search, page, limit } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
      const offset = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        this.appRepo.listApplications({
          jobId: job_role_id,
          status,
          minScore: min_score,
          search,
          limit: limitNum,
          offset
        }),
        this.appRepo.countApplications({
          jobId: job_role_id,
          status,
          minScore: min_score,
          search
        })
      ]);

      const candidatesWithUrls = await Promise.all(
        items.map(async (item) => {
          let downloadUrl = null;
          if (item.resume_id) {
            downloadUrl = `/api/v1/hiring/resumes/${item.resume_id}/file`;
          }
          return {
            ...item,
            resume_download_url: downloadUrl
          };
        })
      );

      return this.sendSuccess(res, {
        items: candidatesWithUrls,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }, 'CV Bank records retrieved');
    } catch (error) {
      next(error);
    }
  };

  exportCsv = async (req, res, next) => {
    try {
      const { job_role_id, status, min_score, search } = req.query;
      const items = await this.appRepo.listApplications({
        jobId: job_role_id,
        status,
        minScore: min_score,
        search,
        limit: 1000,
        offset: 0
      });

      const headers = ['Reference Number', 'Candidate Name', 'Email', 'Phone', 'Job Title', 'Department', 'Match Score', 'Status', 'Applied At'];
      const rows = items.map((item) => [
        item.reference_number || '',
        `"${(item.candidate_name || '').replace(/"/g, '""')}"`,
        item.candidate_email || '',
        item.candidate_phone || '',
        `"${(item.job_title || '').replace(/"/g, '""')}"`,
        item.job_department || '',
        item.match_score !== null ? item.match_score : '',
        item.status || '',
        item.applied_at ? new Date(item.applied_at).toISOString().split('T')[0] : ''
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="roadexpress_cv_bank_export.csv"');
      return res.send(csvContent);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CVBankController;
