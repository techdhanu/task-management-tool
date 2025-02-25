const Task = require('../models/Task');
const { suggestPriority } = require('../services/aiservices'); // Import AI service

// Create a new task
const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    // Use AI service to suggest priority if not provided
    const taskPriority = priority || suggestPriority(description);

    const newTask = new Task({ title, description, dueDate, priority: taskPriority });
    await newTask.save();

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error });
  }
};

// Get all tasks
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tasks', error });
  }
};

// Update a task
const updateTask = async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
};
