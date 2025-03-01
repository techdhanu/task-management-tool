const express = require('express');
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

const router = express.Router();

// Route to get all tasks
router.get('/', getTasks);

// Route to create a new task
router.post('/', createTask);

// Route to update a task by id
router.put('/:id', updateTask);

// Route to delete a task by id
router.delete('/:id', deleteTask);

module.exports = router;