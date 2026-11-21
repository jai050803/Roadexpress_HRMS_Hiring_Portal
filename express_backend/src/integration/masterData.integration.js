class MasterDataIntegration {
  constructor(options = {}) {
    this.fetchDepartmentsFn = options.fetchDepartments || null;
    this.fetchDesignationsFn = options.fetchDesignations || null;
    this.fetchBranchesFn = options.fetchBranches || null;
    this.fetchInterviewersFn = options.fetchInterviewers || null;
  }

  async getDepartments() {
    if (typeof this.fetchDepartmentsFn === 'function') {
      return await this.fetchDepartmentsFn();
    }
    return [
      'Engineering',
      'Operations & Logistics',
      'Fleet Management',
      'Finance & Accounts',
      'Human Resources',
      'Sales & Marketing',
      'Customer Support',
      'Procurement'
    ];
  }

  async getDesignations(department = null) {
    if (typeof this.fetchDesignationsFn === 'function') {
      return await this.fetchDesignationsFn(department);
    }
    const defaultDesignations = {
      Engineering: ['Software Engineer', 'Senior Backend Engineer', 'DevOps Specialist', 'QA Engineer'],
      'Operations & Logistics': ['Logistics Supervisor', 'Hub Manager', 'Route Planner', 'Warehouse Executive'],
      'Fleet Management': ['Fleet Coordinator', 'Vehicle Maintenance Lead', 'Fleet Analyst'],
      'Human Resources': ['HR Generalist', 'Recruitment Specialist', 'HR Business Partner'],
      'Sales & Marketing': ['Business Development Executive', 'Account Manager', 'Marketing Analyst']
    };

    if (department && defaultDesignations[department]) {
      return defaultDesignations[department];
    }
    return Object.values(defaultDesignations).flat();
  }

  async getBranches() {
    if (typeof this.fetchBranchesFn === 'function') {
      return await this.fetchBranchesFn();
    }
    return [
      'Mumbai Central Hub',
      'Delhi NCR Logistics Center',
      'Bengaluru Tech Park',
      'Hyderabad Regional Office',
      'Chennai Distribution Center',
      'Kolkata Hub',
      'Pune Operations Hub'
    ];
  }

  async getInterviewers(department = null) {
    if (typeof this.fetchInterviewersFn === 'function') {
      return await this.fetchInterviewersFn(department);
    }
    return [
      { id: 'usr-1', name: 'Rajesh Sharma', email: 'rajesh.s@roadexpress.com', department: 'Engineering', designation: 'Engineering Director' },
      { id: 'usr-2', name: 'Priya Nair', email: 'priya.n@roadexpress.com', department: 'Operations & Logistics', designation: 'Operations VP' },
      { id: 'usr-3', name: 'Amit Verma', email: 'amit.v@roadexpress.com', department: 'Fleet Management', designation: 'Fleet Operations Lead' }
    ];
  }
}

module.exports = MasterDataIntegration;
