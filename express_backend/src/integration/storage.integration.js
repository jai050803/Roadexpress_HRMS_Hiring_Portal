const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

class StorageIntegration {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || path.resolve(config.upload.directory || './uploads');
    this.customUploadFn = options.uploadFile || null;
    this.customGetUrlFn = options.getPresignedUrl || null;
    this.customDownloadFn = options.downloadFile || null;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  computeHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  sanitizeFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const basename = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${Date.now()}_${basename}${ext}`;
  }

  async saveFile({ buffer, originalname, mimetype, subfolder = 'resumes' }) {
    const fileHash = this.computeHash(buffer);
    const safeName = this.sanitizeFilename(originalname);

    if (typeof this.customUploadFn === 'function') {
      const externalResult = await this.customUploadFn({
        buffer,
        filename: safeName,
        mimetype,
        subfolder,
        hash: fileHash
      });

      return {
        filePath: externalResult.key || externalResult.path || safeName,
        fileUrl: externalResult.url || externalResult.location,
        fileName: safeName,
        fileSize: buffer.length,
        fileHash,
        mimeType: mimetype,
        storageProvider: 'custom_host_storage'
      };
    }

    const targetDir = path.join(this.uploadDir, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, safeName);
    fs.writeFileSync(fullPath, buffer);

    return {
      filePath: fullPath,
      fileUrl: `/uploads/${subfolder}/${safeName}`,
      fileName: safeName,
      fileSize: buffer.length,
      fileHash,
      mimeType: mimetype,
      storageProvider: 'local_disk'
    };
  }

  async getDownloadUrl(filePath, expiresIn = 900) {
    if (typeof this.customGetUrlFn === 'function') {
      return await this.customGetUrlFn(filePath, expiresIn);
    }
    return `/api/v1/hiring/resumes/file?path=${encodeURIComponent(filePath)}`;
  }

  async getFileBuffer(filePath) {
    if (typeof this.customDownloadFn === 'function') {
      return await this.customDownloadFn(filePath);
    }
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    throw new Error(`File not found at path: ${filePath}`);
  }
}

module.exports = StorageIntegration;
