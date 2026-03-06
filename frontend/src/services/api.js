import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

// Her istekte token varsa otomatik ekle
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getRadarItems = () => API.get('/radar');
export const createRadarItem = (data) => API.post('/radar', data);
export const updateRadarItem = (id, data) => API.put(`/radar/${id}`, data);
export const deleteRadarItem = (id) => API.delete(`/radar/${id}`);
export const login = (data) => API.post('/auth/login', data);
export const updateCredentials = (data) => API.put('/auth/credentials', data);

export const getApiKeys = () => API.get('/keys');
export const createApiKey = (data) => API.post('/keys', data);
export const deleteApiKey = (id) => API.delete(`/keys/${id}`);