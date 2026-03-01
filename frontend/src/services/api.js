import axios from 'axios';

const API = axios.create({
 baseURL: 'https://cbt-platform-m6kq.onrender.com/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
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
 