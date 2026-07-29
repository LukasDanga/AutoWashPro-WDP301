const refundRequestService = require('../services/refundRequest.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createRequest = catchAsync(async (req, res) => {
  const { bookingId, reason } = req.body;
  const request = await refundRequestService.createRequest(bookingId, req.userId, req.user.role, reason);
  success(res, request, 'Refund request created', 201);
});

exports.getAllRequests = catchAsync(async (req, res) => {
  const requests = await refundRequestService.getAll(req.query, req.user.role, req.userId);
  success(res, requests, 'Refund requests retrieved');
});

exports.getMyRequests = catchAsync(async (req, res) => {
  const requests = await refundRequestService.getAll({}, 'customer', req.userId);
  success(res, requests, 'My refund requests retrieved');
});

exports.getRequestById = catchAsync(async (req, res) => {
  const request = await refundRequestService.getById(req.params.id, req.user.role, req.userId);
  success(res, request, 'Refund request retrieved');
});

exports.reviewRequest = catchAsync(async (req, res) => {
  const { decision, reviewNote } = req.body;
  const request = await refundRequestService.reviewRequest(req.params.id, req.userId, decision, reviewNote);
  success(res, request, 'Refund request reviewed');
});

exports.deleteRequest = catchAsync(async (req, res) => {
  const result = await refundRequestService.deleteRequest(req.params.id, req.user.role);
  success(res, result, 'Refund request deleted successfully');
});

exports.deleteRequestsByDateRange = catchAsync(async (req, res) => {
  const { dateFrom, dateTo, all } = req.query;
  const deleteAll = all === 'true';
  const result = await refundRequestService.deleteRequestsByDateRange(dateFrom, dateTo, deleteAll);
  success(res, result, result.message);
});
