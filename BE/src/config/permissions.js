const { ROLES } = require('./constants');

const permissions = {
  // Branch routes
  branches: {
    create: [ROLES.ADMIN],
    read: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
    update: [ROLES.ADMIN, ROLES.MANAGER],
    delete: [ROLES.ADMIN],
    updateStatus: [ROLES.ADMIN, ROLES.MANAGER],
  },

  // Vehicle routes
  vehicles: {
    create: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    read: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    update: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    delete: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
  },

  // Auth routes
  auth: {
    register: [ROLES.ADMIN],
    login: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    refreshToken: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    logout: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    getProfile: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    updateProfile: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
    changePassword: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER],
  },
};

module.exports = { permissions, ROLES };
