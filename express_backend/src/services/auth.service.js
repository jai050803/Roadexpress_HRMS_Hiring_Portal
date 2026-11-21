const bcrypt = require('bcryptjs');
const BaseService = require('./base.service');

class AuthService extends BaseService {
  constructor(repositories = {}, integrations = {}) {
    super(repositories, integrations);
    this.userRepo = repositories.userRepository;
    this.authIntegration = integrations.authIntegration;
  }

  async login(email, password) {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.is_active) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const token = this.authIntegration.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    };
  }

  async register(userData) {
    const existing = await this.userRepo.findByEmail(userData.email);
    if (existing) {
      const error = new Error('Email is already registered');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const newUser = await this.userRepo.createUser({
      email: userData.email,
      password_hash: passwordHash,
      full_name: userData.fullName,
      role: userData.role || 'recruiter',
      is_active: true
    });

    const token = this.authIntegration.generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.full_name
    });

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role
      }
    };
  }

  async getCurrentUser(userId) {
    const user = await this.userRepo.findActiveById(userId);
    if (!user) {
      const error = new Error('User not found or inactive');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }
}

module.exports = AuthService;
