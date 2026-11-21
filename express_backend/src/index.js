const { createPool } = require('./database/connection');
const AuthIntegration = require('./integration/auth.integration');
const MasterDataIntegration = require('./integration/masterData.integration');
const OnboardingIntegration = require('./integration/onboarding.integration');
const StorageIntegration = require('./integration/storage.integration');

const UserRepository = require('./repositories/user.repository');
const JobRepository = require('./repositories/job.repository');
const CandidateRepository = require('./repositories/candidate.repository');
const ResumeRepository = require('./repositories/resume.repository');
const ApplicationRepository = require('./repositories/application.repository');
const StatusHistoryRepository = require('./repositories/statusHistory.repository');
const ScreeningRepository = require('./repositories/screening.repository');

const AuthService = require('./services/auth.service');
const JobService = require('./services/job.service');
const CandidateService = require('./services/candidate.service');
const ResumeParserService = require('./services/resumeParser.service');
const ResumeService = require('./services/resume.service');
const ScreeningService = require('./services/screening.service');
const ApplicationService = require('./services/application.service');

const AuthController = require('./controllers/auth.controller');
const JobController = require('./controllers/job.controller');
const CandidateController = require('./controllers/candidate.controller');
const ResumeController = require('./controllers/resume.controller');
const ApplicationController = require('./controllers/application.controller');

const createHiringRouter = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');

function createHiringModule(options = {}) {
  const pool = options.pool ? createPool(options.pool) : createPool();

  const authIntegration = options.authIntegration || new AuthIntegration({
    customAuthMiddleware: options.customAuthMiddleware,
    getUserFromRequest: options.getUserFromRequest
  });

  const masterDataIntegration = options.masterDataIntegration || new MasterDataIntegration({
    fetchDepartments: options.fetchDepartments,
    fetchDesignations: options.fetchDesignations,
    fetchBranches: options.fetchBranches,
    fetchInterviewers: options.fetchInterviewers
  });

  const onboardingIntegration = options.onboardingIntegration || new OnboardingIntegration({
    onHired: options.onHired,
    eventEmitter: options.eventEmitter
  });

  const storageIntegration = options.storageIntegration || new StorageIntegration({
    uploadDir: options.uploadDir,
    uploadFile: options.uploadFile,
    getPresignedUrl: options.getPresignedUrl,
    downloadFile: options.downloadFile
  });

  const userRepository = new UserRepository(pool);
  const jobRepository = new JobRepository(pool);
  const candidateRepository = new CandidateRepository(pool);
  const resumeRepository = new ResumeRepository(pool);
  const applicationRepository = new ApplicationRepository(pool);
  const statusHistoryRepository = new StatusHistoryRepository(pool);
  const screeningRepository = new ScreeningRepository(pool);

  const authService = new AuthService(
    { userRepository },
    { authIntegration }
  );

  const jobService = new JobService(
    { jobRepository },
    { masterDataIntegration }
  );

  const candidateService = new CandidateService(
    { candidateRepository },
    { masterDataIntegration }
  );

  const resumeParserService = new ResumeParserService();

  const resumeService = new ResumeService(
    { resumeRepository, candidateRepository },
    { storageIntegration },
    { resumeParserService }
  );

  const screeningService = new ScreeningService(
    { screeningRepository },
    {}
  );

  const applicationService = new ApplicationService(
    {
      applicationRepository,
      jobRepository,
      candidateRepository,
      statusHistoryRepository
    },
    { onboardingIntegration },
    {
      jobService,
      candidateService,
      resumeService,
      screeningService
    }
  );

  const authController = new AuthController(authService);
  const jobController = new JobController(jobService);
  const candidateController = new CandidateController(candidateService);
  const resumeController = new ResumeController(resumeService);
  const applicationController = new ApplicationController(applicationService);

  const hiringRouter = createHiringRouter({
    controllers: {
      authController,
      jobController,
      candidateController,
      resumeController,
      applicationController
    },
    integrations: {
      authIntegration,
      masterDataIntegration,
      onboardingIntegration,
      storageIntegration
    }
  });

  return {
    router: hiringRouter,
    integrations: {
      authIntegration,
      masterDataIntegration,
      onboardingIntegration,
      storageIntegration
    },
    repositories: {
      userRepository,
      jobRepository,
      candidateRepository,
      resumeRepository,
      applicationRepository,
      statusHistoryRepository,
      screeningRepository
    },
    services: {
      authService,
      jobService,
      candidateService,
      resumeParserService,
      resumeService,
      screeningService,
      applicationService
    },
    controllers: {
      authController,
      jobController,
      candidateController,
      resumeController,
      applicationController
    },
    errorHandler
  };
}

module.exports = {
  createHiringModule,
  AuthIntegration,
  MasterDataIntegration,
  OnboardingIntegration,
  StorageIntegration
};
