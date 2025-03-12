// server/controllers/taskController.js
const Task = require('../models/Task');
const aiServices = require('../services/aiservices');
const CalendarEvent = require('../models/CalendarEvent');
const { createEvent, updateEvent, getEvents, deleteEvent } = require('../services/calendarService');

// Controller to get all calendar events
const getCalendarEvents = async (req, res) => {
  try {
    const startTime = Date.now();
    const events = await getEvents();
    console.log(`Fetched calendar events: ${events.length} events`, events);
    const endTime = Date.now();
    console.log(`Fetched calendar events in ${endTime - startTime}ms`);
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error.message, error.stack);
    res.status(500).json({ message: 'Server error while fetching calendar events', error: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    console.log('Fetching tasks for user:', req.user ? req.user.userId : 'No user in request');
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required or invalid user' });
    }
    const startTime = Date.now();
    const tasks = await Task.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    const endTime = Date.now();
    console.log(`Fetched tasks in ${endTime - startTime}ms for user ${req.user.userId}`);
    const filteredTasks = tasks.map(task => ({
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
      resourceEstimate: task.resourceEstimate,
      teamSize: task.teamSize,
      estimatedDays: task.estimatedDays,
      productivityPrediction: task.productivityPrediction || 'Low',
      taskbenchPrediction: task.taskbenchPrediction || 0,
      jiraTaskComplexity: task.jiraTaskComplexity || 0,
      _id: task._id,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      __v: task.__v
    }));
    res.status(200).json(filteredTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error.stack);
    res.status(500).json({ message: 'Server error while fetching tasks', error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const startTime = Date.now();
    const { title, description, dueDate, priority, status, additionalData } = req.body;

    let taskPriority = priority;
    if (!priority || priority === '') {
      taskPriority = await aiServices.suggestPriority(description, dueDate);
    }

    const taskComplexity = additionalData?.taskComplexity || 5;
    const resourceAllocation = additionalData?.resourceAllocation || 3;
    const teamSize = aiServices.estimateTeamSize(taskComplexity, taskPriority);
    const estimatedDays = aiServices.estimateCompletionTime(taskComplexity, teamSize, taskPriority);
    const resourceEstimate = Math.round((taskComplexity + resourceAllocation) / 2);

    const productivityPrediction = await aiServices.predictRemoteWorkProductivity({
      taskComplexity,
      resourceAllocation,
      Hours_Worked_Per_Week: 40,
      Employment_Type: 'Remote'
    });
    const taskbenchPrediction = await aiServices.predictTaskbenchProductivity({
      taskComplexity,
      resourceAllocation,
      Hours_Worked_Per_Week: 40,
      Employment_Type: 'Remote'
    });
    const jiraTaskComplexity = await aiServices.predictJiraTaskComplexity({
      taskComplexity,
      resourceAllocation,
      Hours_Worked_Per_Week: 40,
      Employment_Type: 'Remote'
    });

    const newTask = new Task({
      title,
      description,
      status: status || 'Pending',
      dueDate: dueDate || new Date(),
      priority: taskPriority,
      resourceEstimate,
      teamSize,
      estimatedDays,
      completed: false,
      productivityPrediction,
      taskbenchPrediction,
      jiraTaskComplexity,
      userId: req.user.userId
    });

    if (status === 'Completed') {
      newTask.status = 'Completed';
      newTask.completed = true;
    }

    const savedTask = await newTask.save();

    if (savedTask && savedTask.dueDate) {
      const calendarEvent = new CalendarEvent({
        taskId: savedTask._id,
        title: title,
        description: description,
        startTime: savedTask.dueDate,
        endTime: new Date(savedTask.dueDate.getTime() + 3600000),
        location: 'N/A',
        allDay: false,
        recurring: false,
      });

      try {
        const calendarStart = Date.now();
        const savedCalendarEvent = await calendarEvent.save();
        console.log('Local Calendar Event created in ' + (Date.now() - calendarStart) + 'ms:', savedCalendarEvent);

        const eventDetails = {
          summary: title,
          description: description,
          start: { dateTime: savedTask.dueDate.toISOString(), timeZone: 'UTC' },
          end: { dateTime: new Date(savedTask.dueDate.getTime() + 3600000).toISOString(), timeZone: 'UTC' },
          location: 'N/A',
        };

        console.log('Attempting to create Google Calendar event:', eventDetails);
        const googleStart = Date.now();
        const googleEvent = await Promise.race([
          createEvent(eventDetails),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000))
        ]);
        savedCalendarEvent.googleEventId = googleEvent.googleEventId;
        await savedCalendarEvent.save();
        console.log('Google Calendar Event created in ' + (Date.now() - googleStart) + 'ms:', googleEvent);
      } catch (calendarError) {
        console.error('Error creating Google Calendar event, saving locally only:', calendarError.message, calendarError.stack);
      }
    }

    const endTime = Date.now();
    console.log(`Task created in ${endTime - startTime}ms for user ${req.user.userId}`);
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
      productivityPrediction: savedTask.productivityPrediction || 'Low',
      taskbenchPrediction: savedTask.taskbenchPrediction || 0,
      jiraTaskComplexity: savedTask.jiraTaskComplexity || 0,
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

const updateTask = async (req, res) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;
    const updates = req.body;

    console.log('Updating task with ID:', id, 'Updates:', updates, 'for user:', req.user.userId);

    const task = await Task.findOne({ _id: id, userId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    // Update task with the provided updates (e.g., { status: "In Progress" })
    const updatedTask = await Task.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Synchronize completed field with status
    if (updates.status) {
      console.log(`Status updated from ${task.status} to ${updates.status}`);
      updatedTask.completed = updates.status === 'Completed';
      await updatedTask.save();
    }

    // Update or create calendar event if dueDate changes
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
            console.log('Attempting to update Google Calendar event:', eventUpdates);
            const googleEvent = await Promise.race([
              updateEvent(calendarEvent.googleEventId, eventUpdates),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000))
            ]);
            console.log('Google Calendar Event updated in ' + (Date.now() - googleStart) + 'ms');
          }
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError.message, calendarError.stack);
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
          console.log('Attempting to create Google Calendar event:', eventDetails);
          const googleStart = Date.now();
          const googleEvent = await Promise.race([
            createEvent(eventDetails),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000))
          ]);
          savedCalendarEvent.googleEventId = googleEvent.googleEventId;
          await savedCalendarEvent.save();
          console.log('Google Calendar Event created in ' + (Date.now() - googleStart) + 'ms:', googleEvent);
        } catch (calendarError) {
          console.error('Error creating calendar event:', calendarError.message, calendarError.stack);
        }
      }
    }

    const endTime = Date.now();
    console.log(`Task updated in ${endTime - startTime}ms for user ${req.user.userId}`);
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
      productivityPrediction: updatedTask.productivityPrediction || 'Low',
      taskbenchPrediction: updatedTask.taskbenchPrediction || 0,
      jiraTaskComplexity: updatedTask.jiraTaskComplexity || 0,
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

const deleteTask = async (req, res) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;

    console.log('Attempting to delete task with ID:', id, 'for user:', req.user.userId);

    const task = await Task.findOne({ _id: id, userId: req.user.userId });
    if (!task) {
      console.log(`Task not found or unauthorized for user ${req.user.userId} with ID ${id}`);
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    console.log('Task to delete:', {
      _id: task._id,
      title: task.title,
      status: task.status,
      userId: task.userId
    });

    const calendarEvent = await CalendarEvent.findOne({ taskId: id });
    const calendarStart = Date.now();
    if (calendarEvent) {
      console.log('Found associated calendar event for task ID:', id);
      if (calendarEvent.googleEventId) {
        try {
          const googleStart = Date.now();
          console.log('Attempting to delete Google Calendar event:', calendarEvent.googleEventId);
          await Promise.race([
            deleteEvent(calendarEvent.googleEventId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000))
          ]);
          console.log('Google Calendar Event deleted in ' + (Date.now() - googleStart) + 'ms');
        } catch (calendarError) {
          console.error('Error deleting Google Calendar event:', calendarError.message, calendarError.stack);
        }
      }
      await CalendarEvent.findByIdAndDelete(calendarEvent._id);
      console.log('Local Calendar Event deleted in ' + (Date.now() - calendarStart) + 'ms');
    } else {
      console.log('No associated calendar event found for task ID:', id);
    }

    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      console.log(`Task deletion failed for ID ${id}, possibly already deleted`);
      return res.status(404).json({ message: 'Task not found' });
    }

    const endTime = Date.now();
    console.log(`Task deleted successfully in ${endTime - startTime}ms for user ${req.user.userId}`);
    res.status(200).json({ message: 'Task deleted successfully', taskId: id });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error while deleting task', error: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getCalendarEvents,
};