class BaseService {
  constructor(repositories = {}, integrations = {}) {
    this.repositories = repositories;
    this.integrations = integrations;
  }
}

module.exports = BaseService;
