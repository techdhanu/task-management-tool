import axios from 'axios';

// Set up the base URL for your API
const API = axios.create({
    baseURL: 'http://localhost:5001/api',
});

// Task Management API calls
export const createTask = (taskData) => API.post('/tasks', taskData);
export const getTasks = () => API.get('/tasks');
export const updateTask = (id, updatedTask) => API.put(`/tasks/${id}`, updatedTask);
export const deleteTask = (id) => API.delete(`/tasks/${id}`);

// Authentication API calls (if you have login functionality)
export const login = (userData) => API.post('/auth/login', userData);
export const register = (userData) => API.post('/auth/register', userData);

// Calendar API calls
export const syncCalendar = (calendarData) => API.post('/calendar/sync', calendarData);

export default API;
