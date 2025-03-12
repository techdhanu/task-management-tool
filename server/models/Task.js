// server/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
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
  productivityPrediction: {
    type: String,
    default: null,
  },
  taskbenchPrediction: {
    type: Number,
    default: null,
  },
  jiraTaskComplexity: {
    type: Number,
    default: null,
  },
  resourceEstimate: {
    type: Number,
    default: null,
  },
  teamSize: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1,
  },
  estimatedDays: {
    type: Number,
    required: true,
    min: 0.5,
    max: 5,
    default: 1,
  },
  aiSummary: {
    type: String,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

taskSchema.pre('save', function(next) {
  if (this.status === 'Completed') {
    this.completed = true;
  } else {
    this.completed = false;
    this.status = this.status === 'In Progress' ? 'In Progress' : 'Pending';
  }
  next();
});

taskSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  const doc = await this.model.findOne(this.getFilter());

  if (!doc) {
    return next(new Error('Task not found'));
  }

  let newStatus = doc.status;
  let newCompleted = doc.completed;

  // Prioritize status from update object
  if (update.status && ['Pending', 'In Progress', 'Completed'].includes(update.status)) {
    newStatus = update.status;
    newCompleted = newStatus === 'Completed';
  } else if (update.completed !== undefined) {
    newCompleted = update.completed;
    newStatus = newCompleted ? 'Completed' : (doc.status === 'In Progress' ? 'In Progress' : 'Pending');
  }

  // Update the query with the resolved values
  this.set({ status: newStatus, completed: newCompleted });
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;