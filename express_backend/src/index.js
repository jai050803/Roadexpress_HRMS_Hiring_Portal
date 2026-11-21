const { createPool } = require('./database/connection');
const AuthIntegration = require('./integration/auth.integration');
const MasterDataIntegration = require('./integration/masterData.integration');
const OnboardingIntegration = require('./integration/onboarding.integration');

const UserRepository = require('./repositories/user.repository');
const JobRepository = require('./repositories/job.repository');
const CandidateRepository = require('./repositories/candidate.repository');

const AuthService = require('./services/auth.service');
const JobService = require('./services/job.service');
const CandidateService = require('./services/candidate.service');

const AuthController = require('./controllers/auth.controller');
const JobController = require('./controllers/job.controller');
const CandidateController = require('./controllers/candidate.controller');

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

  const userRepository = new UserRepository(pool);
  const jobRepository = new JobRepository(pool);
  const candidateRepository = new CandidateRepository(pool);

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

  const authController = new AuthController(authService);
  const jobController = new JobController(jobService);
  const candidateController = new CandidateController(candidateService);

  const hiringRouter = createHiringRouter({
    controllers: {
      authController,
      jobController,
      candidateController
    },
    integrations: {
      authIntegration,
      masterDataIntegration,
      onboardingIntegration
    }
  });

  return {
    router: hiringRouter,
    integrations: {
      authIntegration,
      masterDataIntegration,
      onboardingIntegration
    },
    repositories: {
      userRepository,
      jobRepository,
      candidateRepository
    },
    services: {
      authService,
      jobService,
      candidateService
    },
    controllers: {
      authController,
      jobController,
      candidateController
    },
    errorHandler
  };
}

module.exports = {
  createHiringModule,
  AuthIntegration,
  MasterDataIntegration,
  OnboardingIntegration
};
