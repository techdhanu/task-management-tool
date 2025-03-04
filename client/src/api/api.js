// client/src/api/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const createTask = (taskData) => api.post('/tasks', taskData);
export const getTasks = () => api.get('/tasks');
export const updateTask = (id, taskData) => api.put(`/tasks/${id}`, taskData);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const getCalendarEvents = () => api.get('/calendar/events');
export const createEvent = (eventData) => api.post('/calendar/events', eventData);
export const updateEvent = (eventId, eventData) => api.put(`/calendar/events/${eventId}`, eventData);
export const deleteEvent = (eventId) => api.delete(`/calendar/events/${eventId}`);

export default api;