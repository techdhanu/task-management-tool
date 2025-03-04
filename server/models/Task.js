// server/models/Task.js
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
    required: true,
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
    required: true,
  },
  // AI prediction fields (optional, not shown in responses, kept for future use or analytics)
  productivityPrediction: {
    type: String, // Categorical labels (e.g., 'Low', 'Medium', 'High')
    default: null, // Explicitly set to null if not provided
  },
  taskbenchPrediction: {
    type: Number, // Numeric score
    default: null, // Explicitly set to null if not provided
  },
  jiraTaskComplexity: {
    type: Number, // Numeric score
    default: null, // Explicitly set to null if not provided
  },
  resourceEstimate: {
    type: Number, // Numeric resource estimate
    default: null, // Explicitly set to null if not provided
  },
  // Team and time estimates (required, calculated dynamically)
  teamSize: {
    type: Number,
    required: true, // Ensure teamSize is required
    min: 1,
    max: 5,
    default: 1,
  },
  estimatedDays: {
    type: Number,
    required: true, // Ensure estimatedDays is required
    min: 0.5,
    default: 1,
  },
  // Optional field for future AI summaries (remove if not needed)
  aiSummary: {
    type: String,
    default: null, // Explicitly set to null if not provided
  },
}, { timestamps: true });

// Middleware to ensure consistency between status and completed on save
taskSchema.pre('save', function(next) {
  if (this.status === 'Completed') {
    this.completed = true;
  } else if (this.completed === true) {
    this.status = 'Completed';
  } else {
    this.completed = false;
    this.status = 'Pending'; // Reset to Pending if not Completed
  }
  next();
});

// Middleware to ensure consistency between status and completed on findOneAndUpdate
taskSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  const doc = await this.model.findOne(this.getFilter()); // Fetch the current document

  if (!doc) {
    return next(new Error('Task not found'));
  }

  let newStatus = doc.status;
  let newCompleted = doc.completed;

  // Apply updates
  if (update.status === 'Completed' || update.completed === true) {
    newStatus = 'Completed';
    newCompleted = true;
  } else if (update.status && update.status !== 'Completed') {
    newStatus = update.status;
    newCompleted = false;
  } else if (update.completed === false) {
    newStatus = 'Pending';
    newCompleted = false;
  }

  // Update the query to ensure consistency
  this.set({ status: newStatus, completed: newCompleted });
  next();
});

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;