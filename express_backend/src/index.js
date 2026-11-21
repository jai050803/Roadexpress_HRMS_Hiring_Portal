const { createPool } = require('./database/connection');
const AuthIntegration = require('./integration/auth.integration');
const MasterDataIntegration = require('./integration/masterData.integration');
const OnboardingIntegration = require('./integration/onboarding.integration');

const UserRepository = require('./repositories/user.repository');
const AuthService = require('./services/auth.service');
const AuthController = require('./controllers/auth.controller');

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

  const authService = new AuthService(
    { userRepository },
    { authIntegration }
  );

  const authController = new AuthController(authService);

  const hiringRouter = createHiringRouter({
    controllers: {
      authController
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
      userRepository
    },
    services: {
      authService
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
