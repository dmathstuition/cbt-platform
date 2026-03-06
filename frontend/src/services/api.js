import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://cbt-platform-m6kq.onrender.com/api'
});

// Request interceptor — attach token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Track if we're already refreshing to avoid loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Response interceptor — handle 401 with token refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return API(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token — force logout
        forceLogout();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL || 'https://cbt-platform-m6kq.onrender.com/api'}/auth/refresh`,
          { refreshToken }
        );

        const { token, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem('token', token);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        processQueue(null, token);
        return API(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const forceLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Also store refreshToken on login — update AuthContext to call this
export const storeTokens = (token, refreshToken) => {
  localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  refresh: (refreshToken) => API.post('/auth/refresh', { refreshToken }),
};

export const examAPI = {
  getAll: () => API.get('/exams'),
  getOne: (id) => API.get(`/exams/${id}`),
  create: (data) => API.post('/exams', data),
  updateStatus: (id, status) => API.patch(`/exams/${id}/status`, { status }),
  delete: (id) => API.delete(`/exams/${id}`),
  getResults: (id) => API.get(`/exams/${id}/results`),
};

export const questionAPI = {
  create: (data) => API.post('/questions', data),
  getAll: (params) => API.get('/questions', { params }),
  addToExam: (data) => API.post('/questions/add-to-exam', data),
  removeFromExam: (data) => API.post('/questions/remove-from-exam', data),
  getExamQuestions: (exam_id) => API.get(`/questions/exam/${exam_id}`),
  delete: (id) => API.delete(`/questions/${id}`),
};

export const sessionAPI = {
  start: (exam_id) => API.post('/sessions/start', { exam_id }),
  submit: (session_id, responses) => API.post('/sessions/submit', { session_id, responses }),
  getMyResults: () => API.get('/sessions/my-results'),
};

export const classAPI = {
  getAll: () => API.get('/classes'),
  create: (data) => API.post('/classes', data),
  update: (id, data) => API.put(`/classes/${id}`, data),
  delete: (id) => API.delete(`/classes/${id}`),
  getStudents: (id) => API.get(`/classes/${id}/students`),
  getSubjects: (id) => API.get(`/classes/${id}/subjects`),
  assignSubject: (data) => API.post('/classes/assign-subject', data),
  removeSubject: (data) => API.post('/classes/remove-subject', data),
};

export const subjectAPI = {
  getAll: () => API.get('/subjects'),
  create: (data) => API.post('/subjects', data),
  update: (id, data) => API.put(`/subjects/${id}`, data),
  delete: (id) => API.delete(`/subjects/${id}`),
  getAssignments: () => API.get('/subjects/assignments'),
  assignTeacher: (data) => API.post('/subjects/assign-teacher', data),
  removeAssignment: (id) => API.delete(`/subjects/assignments/${id}`),
};

export default API;