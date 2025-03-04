// server/models/CalendarEvent.js
const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task', // Reference to the Task model
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    location: {
        type: String,
        default: 'N/A',
    },
    allDay: {
        type: Boolean,
        default: false,
    },
    recurring: {
        type: Boolean,
        default: false,
    },
    recurrenceRule: { // Optional field for recurring events (e.g., daily, weekly)
        type: String, // Example: "FREQ=DAILY;INTERVAL=1" (iCal format)
    },
    googleEventId: { // Store the Google Calendar event ID for synchronization
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

// Create the CalendarEvent model
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

module.exports = CalendarEvent;