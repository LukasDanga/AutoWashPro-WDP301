/**
 * AutoWashPro Feedback API Service
 *
 * TODO(BACKEND): no `POST /api/feedbacks` route exists yet. The Mobile screen
 * fires a real request and surfaces the server error (typically 404) instead
 * of the previous `setTimeout` mock that silently "succeeded". As soon as the
 * BE route is added, the request body shape below should remain stable.
 */

import { apiClient } from './client';

export type FeedbackType = 'bug' | 'suggestion' | 'complaint' | 'praise' | 'other';

export interface FeedbackPayload {
  type: FeedbackType;
  subject?: string;
  message: string;
  rating?: number;        // 1-5, optional
  contactPermission?: boolean;
}

export interface FeedbackResponse {
  message: string;
}

export const submit = async (data: FeedbackPayload): Promise<FeedbackResponse> => {
  const response = await apiClient.post('/feedbacks', data);
  return response.data;
};

export const feedbackApi = { submit };
export default feedbackApi;
