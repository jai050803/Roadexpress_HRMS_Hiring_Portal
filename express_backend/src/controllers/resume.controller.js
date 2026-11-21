const BaseController = require('./base.controller');

class ResumeController extends BaseController {
  constructor(resumeService) {
    super();
    this.resumeService = resumeService;
  }

  uploadResume = async (req, res, next) => {
    try {
      const file = req.file;
      const { candidate_id, application_id, job_id } = req.body;

      const result = await this.resumeService.uploadAndProcessResume({
        file,
        candidateId: candidate_id,
        applicationId: application_id,
        jobRoleId: job_id
      });

      return this.sendCreated(res, result, 'Resume uploaded and parsed successfully');
    } catch (error) {
      next(error);
    }
  };

  getResume = async (req, res, next) => {
    try {
      const { id } = req.params;
      const resume = await this.resumeService.getResumeById(id);
      return this.sendSuccess(res, resume, 'Resume metadata retrieved');
    } catch (error) {
      next(error);
    }
  };

  getPresignedUrl = async (req, res, next) => {
    try {
      const { id } = req.params;
      const expiresIn = req.query.expires_in ? parseInt(req.query.expires_in, 10) : 900;
      const result = await this.resumeService.getPresignedUrl(id, expiresIn);
      return this.sendSuccess(res, result, 'Presigned URL generated');
    } catch (error) {
      next(error);
    }
  };

  streamFile = async (req, res, next) => {
    try {
      const { id } = req.params;
      const fileData = await this.resumeService.getResumeFile(id);

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileData.filename}"`);
      res.setHeader('Content-Length', fileData.buffer.length);

      return res.send(fileData.buffer);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ResumeController;
