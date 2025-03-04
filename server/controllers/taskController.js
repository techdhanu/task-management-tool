// server/controllers/taskController.js
const Task = require('../models/Task');
const aiServices = require('../services/aiservices');
const CalendarEvent = require('../models/CalendarEvent'); // Import CalendarEvent model
const { createEvent, updateEvent, getEvents, deleteEvent } = require('../services/calendarService'); // Import calendar service

// Load AI models at server startup (call this in server.js)
aiServices.loadModels().then(() => console.log('AI models loaded')).catch(err => console.error('Error loading AI models:', err));

// Controller to get all tasks (only Pending or In Progress, excluding Completed)
const getTasks = async (req, res) => {
  try {
    const startTime = Date.now();
    const tasks = await Task.find({ status: { $in: ['Pending', 'In Progress'] } }).sort({ createdAt: -1 });
    const endTime = Date.now();
    console.log(`Fetched tasks in ${endTime - startTime}ms`);
    // Filter out AI prediction fields from the response
    const filteredTasks = tasks.map(task => ({
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
      resourceEstimate: task.resourceEstimate, // Keep if needed for resource tracking
      teamSize: task.teamSize,
      estimatedDays: task.estimatedDays,
      _id: task._id,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      __v: task.__v
    }));
    res.status(200).json(filteredTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// Controller to create a new task (with AI predictions disabled, focusing on core features)
const createTask = async (req, res) => {
  try {
    const startTime = Date.now();
    const { title, description, dueDate, priority, status, additionalData } = req.body;

    // Get priority suggestion if not provided (fast, no Python involved)
    let taskPriority = priority;
    if (!priority || priority === '') {
      taskPriority = await aiServices.suggestPriority(description, dueDate); // Fast, rule-based, no Python
    }

    // Calculate teamSize and estimatedDays dynamically (fast, no AI needed)
    const taskComplexity = additionalData?.taskComplexity || 5;
    const resourceAllocation = additionalData?.resourceAllocation || 3;
    const teamSize = aiServices.estimateTeamSize(taskComplexity, taskPriority);
    const estimatedDays = aiServices.estimateCompletionTime(taskComplexity, teamSize, taskPriority);
    const resourceEstimate = Math.round((taskComplexity + resourceAllocation) / 2); // Simple heuristic for resource estimate

    // Create new task without AI predictions
    const newTask = new Task({
      title,
      description,
      status: status || 'Pending',
      dueDate: dueDate || new Date(),
      priority: taskPriority,
      // Removed AI prediction fields (productivityPrediction, taskbenchPrediction, jiraTaskComplexity)
      resourceEstimate,
      teamSize,
      estimatedDays,
      completed: false
    });

    // If status is 'Completed', set completed to true
    if (status === 'Completed') {
      newTask.completed = true;
    }

    // Save the task to the database (fast operation)
    const savedTask = await newTask.save();

    // Create a local CalendarEvent and attempt Google Calendar synchronization (fast, with timeout)
    if (savedTask && savedTask.dueDate) {
      const calendarEvent = new CalendarEvent({
        taskId: savedTask._id,
        title: title,
        description: description,
        startTime: savedTask.dueDate,
        endTime: new Date(savedTask.dueDate.getTime() + 3600000), // 1 hour duration
        location: 'N/A',
        allDay: false,
        recurring: false,
      });

      try {
        const calendarStart = Date.now();
        const savedCalendarEvent = await calendarEvent.save();
        console.log('Local Calendar Event created in ' + (Date.now() - calendarStart) + 'ms:', savedCalendarEvent);

        // Attempt to create a Google Calendar event with a 5-second timeout
        const eventDetails = {
          summary: title,
          description: description,
          start: { dateTime: savedTask.dueDate.toISOString(), timeZone: 'UTC' },
          end: { dateTime: new Date(savedTask.dueDate.getTime() + 3600000).toISOString(), timeZone: 'UTC' },
          location: 'N/A',
        };

        const googleStart = Date.now();
        const googleEvent = await Promise.race([
          createEvent(eventDetails),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000)) // 5-second timeout
        ]);
        savedCalendarEvent.googleEventId = googleEvent.googleEventId;
        await savedCalendarEvent.save();
        console.log('Google Calendar Event created in ' + (Date.now() - googleStart) + 'ms:', googleEvent);
      } catch (calendarError) {
        console.error('Error creating Google Calendar event, saving locally only:', calendarError.message);
        // Continue with local event even if Google fails (fast fallback)
      }
    }

    const endTime = Date.now();
    console.log(`Task created in ${endTime - startTime}ms`);
    // Filter out AI prediction fields from the response
    const filteredTask = {
      title: savedTask.title,
      description: savedTask.description,
      status: savedTask.status,
      dueDate: savedTask.dueDate,
      priority: savedTask.priority,
      completed: savedTask.completed,
      resourceEstimate: savedTask.resourceEstimate,
      teamSize: savedTask.teamSize,
      estimatedDays: savedTask.estimatedDays,
      _id: savedTask._id,
      createdAt: savedTask.createdAt,
      updatedAt: savedTask.updatedAt,
      __v: savedTask.__v
    };
    res.status(201).json(filteredTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error while creating task', error: error.message });
  }
};

// Controller to update a task (with AI predictions disabled, focusing on core features)
const updateTask = async (req, res) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;
    const updates = req.body;

    console.log('Updating task with ID:', id, 'Updates:', updates); // Debug log

    // Find task and update (fast operation)
    const updatedTask = await Task.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // If status is updated to 'Completed' or completed is set to true, ensure consistency (fast operation)
    if (updates.status === 'Completed' || updates.completed === true) {
      updatedTask.status = 'Completed';
      updatedTask.completed = true;
    } else if (updates.status && updates.status !== 'Completed') {
      updatedTask.completed = false;
      updatedTask.status = updates.status;
    } else if (updates.completed === false) {
      updatedTask.completed = false;
      updatedTask.status = 'Pending';
    }

    await updatedTask.save();

    // Update or create calendar event if dueDate changes (fast, with timeout)
    if (updates.dueDate) {
      const calendarEvent = await CalendarEvent.findOne({ taskId: id });
      const calendarStart = Date.now();
      if (calendarEvent) {
        calendarEvent.startTime = updates.dueDate;
        calendarEvent.endTime = new Date(new Date(updates.dueDate).getTime() + 3600000);
        try {
          await calendarEvent.save();
          console.log('Local Calendar Event updated in ' + (Date.now() - calendarStart) + 'ms');
          if (calendarEvent.googleEventId) {
            const googleStart = Date.now();
            const eventUpdates = {
              start: { dateTime: updates.dueDate.toISOString(), timeZone: 'UTC' },
              end: { dateTime: new Date(new Date(updates.dueDate).getTime() + 3600000).toISOString(), timeZone: 'UTC' },
            };
            const googleEvent = await Promise.race([
              updateEvent(calendarEvent.googleEventId, eventUpdates),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000)) // 5-second timeout
            ]);
            console.log('Google Calendar Event updated in ' + (Date.now() - googleStart) + 'ms');
          }
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError.message);
        }
      } else if (updates.dueDate) {
        const newCalendarEvent = new CalendarEvent({
          taskId: id,
          title: updatedTask.title,
          description: updatedTask.description,
          startTime: updates.dueDate,
          endTime: new Date(new Date(updates.dueDate).getTime() + 3600000),
          location: 'N/A',
          allDay: false,
          recurring: false,
        });
        try {
          const savedCalendarEvent = await newCalendarEvent.save();
          console.log('Local Calendar Event created in ' + (Date.now() - calendarStart) + 'ms');
          const eventDetails = {
            summary: updatedTask.title,
            description: updatedTask.description,
            start: { dateTime: updates.dueDate.toISOString(), timeZone: 'UTC' },
            end: { dateTime: new Date(new Date(updates.dueDate).getTime() + 3600000).toISOString(), timeZone: 'UTC' },
            location: 'N/A',
          };
          const googleStart = Date.now();
          const googleEvent = await Promise.race([
            createEvent(eventDetails),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000)) // 5-second timeout
          ]);
          savedCalendarEvent.googleEventId = googleEvent.googleEventId;
          await savedCalendarEvent.save();
          console.log('Google Calendar Event created in ' + (Date.now() - googleStart) + 'ms');
        } catch (calendarError) {
          console.error('Error creating calendar event:', calendarError.message);
        }
      }
    }

    const endTime = Date.now();
    console.log(`Task updated in ${endTime - startTime}ms`);
    // Filter out AI prediction fields from the response
    const filteredTask = {
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      dueDate: updatedTask.dueDate,
      priority: updatedTask.priority,
      completed: updatedTask.completed,
      resourceEstimate: updatedTask.resourceEstimate,
      teamSize: updatedTask.teamSize,
      estimatedDays: updatedTask.estimatedDays,
      _id: updatedTask._id,
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt,
      __v: updatedTask.__v
    };
    res.status(200).json(filteredTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error while updating task', error: error.message });
  }
};

// Controller to delete a task (with performance optimization)
const deleteTask = async (req, res) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;

    console.log('Deleting task with ID:', id); // Debug log

    // Find and delete any associated calendar event first (fast, with timeout)
    const calendarEvent = await CalendarEvent.findOne({ taskId: id });
    const calendarStart = Date.now();
    if (calendarEvent) {
      if (calendarEvent.googleEventId) {
        try {
          const googleStart = Date.now();
          await Promise.race([
            deleteEvent(calendarEvent.googleEventId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000)) // 5-second timeout
          ]);
          console.log('Google Calendar Event deleted in ' + (Date.now() - googleStart) + 'ms');
        } catch (calendarError) {
          console.error('Error deleting Google Calendar event:', calendarError.message);
        }
      }
      await CalendarEvent.findByIdAndDelete(calendarEvent._id);
      console.log('Local Calendar Event deleted in ' + (Date.now() - calendarStart) + 'ms');
    }

    // Find task and delete (fast operation)
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const endTime = Date.now();
    console.log(`Task deleted in ${endTime - startTime}ms`);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error while deleting task', error: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};