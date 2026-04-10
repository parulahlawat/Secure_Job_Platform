// Group messaging API for frontend
import api from './api'

export const groupAPI = {
  create: (data) => api.post('/messages/groups', data),
  list: () => api.get('/messages/groups'),
  sendMessage: (groupId, data) => api.post(`/messages/groups/${groupId}/send`, data),
  getMessages: (groupId) => api.get(`/messages/groups/${groupId}/messages`),
}
