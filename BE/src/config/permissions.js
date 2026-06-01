const { ROLES } = require('./constants');

const permissions = {
  branches: {
    create: [ROLES.ADMIN],
    read: [ROLES.ADMIN, ROLES.MANAGER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER],
    update: [ROLES.ADMIN, ROLES.MANAGER],
    delete: [ROLES.ADMIN],
    updateStatus: [ROLES.ADMIN, ROLES.MANAGER],
  },
  vehicles: {
    create: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    read: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    update: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    delete: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
  },
  packages: {
    create: [ROLES.ADMIN],
    read: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    update: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
  },
  bookings: {
    create: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    readAll: [ROLES.ADMIN, ROLES.MANAGER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    update: [ROLES.ADMIN, ROLES.MANAGER],
    updateStatus: [ROLES.ADMIN, ROLES.MANAGER],
    cancel: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    delete: [ROLES.ADMIN],
    slots: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
  },
  payments: {
    create: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    readAll: [ROLES.ADMIN, ROLES.MANAGER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    confirm: [ROLES.ADMIN, ROLES.MANAGER],
    refund: [ROLES.ADMIN, ROLES.MANAGER],
  },
  vouchers: {
    create: [ROLES.ADMIN, ROLES.MANAGER],
    readAll: [ROLES.ADMIN, ROLES.MANAGER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    validate: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    redeem: [ROLES.ADMIN, ROLES.MANAGER],
    update: [ROLES.ADMIN, ROLES.MANAGER],
    delete: [ROLES.ADMIN],
  },
  checkins: {
    checkIn: [ROLES.ADMIN, ROLES.MANAGER],
    readAll: [ROLES.ADMIN, ROLES.MANAGER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    updateStatus: [ROLES.ADMIN, ROLES.MANAGER],
    stats: [ROLES.ADMIN, ROLES.MANAGER],
  },
  notifications: {
    readAll: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    readOne: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    markRead: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    markAllRead: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    delete: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
    deleteAll: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER],
  },
};

module.exports = { permissions, ROLES };
