// server/routes/taskroutes.js
const express = require('express');
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getCalendarEvents
} = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth'); // Import from middleware

const router = express.Router();

// Apply middleware to all routes
router.use(authMiddleware);

router.get('/', getTasks);           // GET /api/tasks - Fetch user's tasks
router.post('/', createTask);        // POST /api/tasks - Create a task
router.put('/:id', updateTask);      // PUT /api/tasks/:id - Update a task
router.delete('/:id', deleteTask);   // DELETE /api/tasks/:id - Delete a task
router.get('/tasks/calendar/events', getCalendarEvents); // GET calendar events (if still needed)

module.exports = router;