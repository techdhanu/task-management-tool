// server/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true, // Remove whitespace for cleaner data
  },
  description: {
    type: String,
    required: true,
    trim: true, // Remove whitespace for cleaner data
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
    max: 5, // Cap at 5 days to match your estimateCompletionTime logic
    default: 1,
  },
  // Optional field for future AI summaries (remove if not needed)
  aiSummary: {
    type: String,
    default: null, // Explicitly set to null if not provided
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
});

// Add indexes for better query performance
taskSchema.index({ status: 1 }); // Index on status for filtering (e.g., Kanban board)
taskSchema.index({ dueDate: 1 }); // Index on dueDate for sorting and filtering
taskSchema.index({ createdAt: -1 }); // Index on createdAt for sorting (descending)

// Middleware to ensure consistency between status and completed on save
taskSchema.pre('save', function(next) {
  if (this.status === 'Completed') {
    this.completed = true;
  } else {
    this.completed = false;
    this.status = this.status === 'In Progress' ? 'In Progress' : 'Pending'; // Ensure In Progress stays as is, else reset to Pending
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
  } else if (update.status === 'In Progress') {
    newStatus = 'In Progress';
    newCompleted = false;
  } else if (update.status === 'Pending' || update.completed === false) {
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