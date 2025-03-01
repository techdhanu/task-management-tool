const Task = require('../models/Task');
const aiServices = require('../services/aiservices');

// Controller to get all tasks
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// Controller to create a new task
const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, status, additionalData } = req.body;

    // Extract additional data for AI predictions if available
    const taskComplexity = additionalData?.taskComplexity || 5; // Default value if not provided
    const resourceAllocation = additionalData?.resourceAllocation || 3; // Default value if not provided

    // Prepare data for AI predictions
    const predictionInput = {
      taskComplexity,
      resourceAllocation
    };

    // Get priority suggestion if not provided
    let taskPriority = priority;
    if (!priority || priority === '') {
      taskPriority = await aiServices.suggestPriority(description);
    }

    // Make AI predictions (with error handling)
    let productivityPrediction = 0;
    let taskbenchPrediction = 0;
    let jiraTaskComplexity = 0;
    let resourceEstimate = 0;

    try {
      // Run predictions in parallel for better performance
      const [productivity, taskbench, jira] = await Promise.all([
        aiServices.predictRemoteWorkProductivity(predictionInput),
        aiServices.predictTaskbenchProductivity(predictionInput),
        aiServices.predictJiraTaskComplexity(predictionInput)
      ]);

      productivityPrediction = productivity;
      taskbenchPrediction = taskbench;
      jiraTaskComplexity = jira;
      resourceEstimate = Math.round((taskComplexity + resourceAllocation) / 2); // Simple rule for resource estimate
    } catch (error) {
      console.error('Error making AI predictions:', error);
      // Continue with default values
    }

    // Create new task with predictions
    const newTask = new Task({
      title,
      description,
      status: status || 'Pending',
      dueDate,
      priority: taskPriority,
      productivityPrediction,
      taskbenchPrediction,
      jiraTaskComplexity,
      resourceEstimate,
      completed: false
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
};

// Controller to update a task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find task and update
    const updatedTask = await Task.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
};

// Controller to delete a task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Find task and delete
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};