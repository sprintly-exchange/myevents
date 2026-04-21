import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    } else if (error.response?.status === 402) {
      window.location.href = '/pending-payment';
    }
    return Promise.reject(error);
  }
);

export default api;
