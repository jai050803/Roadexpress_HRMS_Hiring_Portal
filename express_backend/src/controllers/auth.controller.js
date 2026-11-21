const BaseController = require('./base.controller');

class AuthController extends BaseController {
  constructor(authService) {
    super();
    this.authService = authService;
  }

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      return this.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  register = async (req, res, next) => {
    try {
      const result = await this.authService.register(req.body);
      return this.sendCreated(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req, res, next) => {
    try {
      const user = await this.authService.getCurrentUser(req.hiringUser.id);
      return this.sendSuccess(res, user, 'User profile fetched');
    } catch (error) {
      next(error);
    }
  };

  listHRUsers = async (req, res, next) => {
    try {
      const users = await this.authService.listHRUsers();
      return this.sendSuccess(res, users, 'HR users retrieved');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = AuthController;
