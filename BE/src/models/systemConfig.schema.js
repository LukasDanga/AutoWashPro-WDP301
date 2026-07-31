const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  reason: { type: String }
}, { _id: false });

const SystemConfigSchema = new Schema({
  key: { 
    type: String, 
    required: true, 
    trim: true,
    index: true
  },
  value: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  type: {
    type: String,
    enum: ['number', 'string', 'boolean', 'json'],
    required: true
  },
  scope: {
    type: String,
    enum: ['global', 'branch', 'package'],
    default: 'global'
  },
  referenceId: {
    type: Schema.Types.ObjectId, // Refers to Branch or Package if scope is not global
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: 'general',
    index: true
  },
  description: {
    type: String
  },
  version: {
    type: Number,
    default: 1
  },
  auditLog: [AuditLogSchema]
}, { 
  timestamps: true 
});

// Ensure that a key is unique within a specific scope and referenceId
SystemConfigSchema.index({ key: 1, scope: 1, referenceId: 1 }, { unique: true });

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
