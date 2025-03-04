const express = require('express');
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

const router = express.Router();

// Route to get all tasks
router.get('/', async (req, res, next) => {
  try {
    await getTasks(req, res);
  } catch (error) {
    next(error); // Forward error to global error handler if defined
  }
});

// Route to create a new task
router.post('/', async (req, res, next) => {
  try {
    await createTask(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to update a task by id
router.put('/:id', async (req, res, next) => {
  try {
    await updateTask(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to delete a task by id
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteTask(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
