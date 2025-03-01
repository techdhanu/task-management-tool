const mongoose = require('mongoose');

// Define the Task schema
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  dueDate: {
    type: Date,
    required: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  // AI prediction fields
  productivityPrediction: {
    type: Number,  // Numeric score prediction
  },
  taskbenchPrediction: {
    type: Number,  // Numeric score prediction
  },
  jiraTaskComplexity: {
    type: Number,  // Numeric score prediction
  },
  resourceEstimate: {
    type: Number,  // Numeric resource estimate
  },
  // New enhanced fields
  teamSize: {
    type: Number,
    default: 1,
  },
  estimatedDays: {
    type: Number,
    default: 1,
  },
  aiSummary: {
    type: String,
  },
}, { timestamps: true });

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;