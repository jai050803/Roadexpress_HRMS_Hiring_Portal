const BaseService = require('./base.service');
const { verifyMagicBytes } = require('../middleware/upload.middleware');

class ResumeService extends BaseService {
  constructor(repositories = {}, integrations = {}, services = {}) {
    super(repositories, integrations);
    this.resumeRepo = repositories.resumeRepository;
    this.candidateRepo = repositories.candidateRepository;
    this.storage = integrations.storageIntegration;
    this.parser = services.resumeParserService;
  }

  async uploadAndProcessResume({ file, candidateId = null, applicationId = null, jobRoleId = null }) {
    if (!file || !file.buffer) {
      const error = new Error('No resume file provided for upload');
      error.statusCode = 400;
      error.code = 'FILE_REQUIRED';
      throw error;
    }

    verifyMagicBytes(file.buffer, file.mimetype);

    const subfolder = jobRoleId ? `resumes/${jobRoleId}` : 'resumes';
    const storedFile = await this.storage.saveFile({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      subfolder
    });

    let parseResult = { rawText: '', parsedJson: {} };
    let parseStatus = 'done';
    let parseError = null;

    try {
      parseResult = await this.parser.parseResume(file.buffer);
    } catch (err) {
      parseStatus = 'failed';
      parseError = err.message;
    }

    const resumeRecord = await this.resumeRepo.createResume({
      candidate_id: candidateId,
      application_id: applicationId,
      file_path: storedFile.filePath,
      file_url: storedFile.fileUrl,
      original_filename: storedFile.fileName,
      file_size: storedFile.fileSize,
      file_size_bytes: storedFile.fileSize,
      file_hash: storedFile.fileHash,
      mime_type: storedFile.mimeType,
      parse_status: parseStatus,
      parsed_text: parseResult.rawText,
      parsed_json: parseResult.parsedJson,
      parse_error: parseError
    });

    if (candidateId && parseResult.parsedJson.skills?.length > 0) {
      await this.candidateRepo.update('hiring_candidates', candidateId, {
        skills: parseResult.parsedJson.skills
      });
    }

    return {
      resume: resumeRecord,
      extracted: parseResult.parsedJson
    };
  }

  async getResumeById(id) {
    const resume = await this.resumeRepo.findById(id);
    if (!resume) {
      const error = new Error('Resume not found');
      error.statusCode = 404;
      error.code = 'RESUME_NOT_FOUND';
      throw error;
    }
    return resume;
  }

  async getResumeFile(id) {
    const resume = await this.getResumeById(id);
    const buffer = await this.storage.getFileBuffer(resume.file_path);
    return {
      buffer,
      filename: resume.original_filename || resume.file_name || 'resume.pdf',
      mimeType: resume.mime_type || 'application/pdf'
    };
  }

  async getPresignedUrl(id, expiresIn = 900) {
    const resume = await this.getResumeById(id);
    const downloadUrl = await this.storage.getDownloadUrl(resume.file_path, expiresIn);
    return {
      resume_id: resume.id,
      file_name: resume.original_filename || resume.file_name,
      download_url: downloadUrl,
      expires_in_seconds: expiresIn
    };
  }
}

module.exports = ResumeService;
