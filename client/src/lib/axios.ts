import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const publicPaths = ['/login', '/register', '/rsvp'];
    const onPublicPage = publicPaths.some(p => window.location.pathname.startsWith(p));

    if (error.response?.status === 401 && !onPublicPage && !url.includes('/auth/me')) {
      window.location.href = '/login';
    } else if (error.response?.status === 402 && error.response?.data?.upgrade_required && !onPublicPage) {
      window.location.href = '/upgrade';
    }
    return Promise.reject(error);
  }
);

export default api;
