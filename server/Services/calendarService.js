// server/services/calendarService.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load your credentials from the JSON file
const keyPath = path.join(__dirname, '..', 'googleCalendarConfig.json'); // Adjust the path if needed

let auth;

if (fs.existsSync(keyPath)) {
    // Check if the credentials file exists
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    // Verify required fields for service account
    if (!keyFile.client_email || !keyFile.private_key) {
        throw new Error('private_key and client_email are required in googleCalendarConfig.json');
    }

    // Set up the OAuth2 client for service account
    auth = new google.auth.JWT({
        email: keyFile.client_email,
        key: keyFile.private_key.replace(/\\n/g, '\n'), // Handle newline characters in private_key
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
} else {
    // Handle the case where the credentials file is missing
    console.error('Google Calendar credentials file not found. Please ensure googleCalendarConfig.json exists.');
    process.exit(1); // Exit if credentials are missing
}

// Create a calendar API client
const calendar = google.calendar({ version: 'v3', auth });

/**
 * Function to create a new event in the user's calendar.
 * @param {object} eventDetails - The event data (summary, start, end, etc.)
 * @returns {Promise<object>} The created event data
 */
async function createEvent(eventDetails) {
    try {
        if (!auth) {
            throw new Error('Authentication is not initialized');
        }

        const response = await calendar.events.insert({
            calendarId: 'primary', // 'primary' refers to the user's primary calendar (service account needs access)
            requestBody: {
                summary: eventDetails.summary || 'Task Event',
                description: eventDetails.description || '',
                start: {
                    dateTime: eventDetails.start.dateTime || new Date().toISOString(),
                    timeZone: 'UTC', // Adjust as needed
                },
                end: {
                    dateTime: eventDetails.end.dateTime || new Date(Date.now() + 3600000).toISOString(), // Default to 1 hour later
                    timeZone: 'UTC', // Adjust as needed
                },
                location: eventDetails.location || 'N/A',
                recurrence: eventDetails.recurring && eventDetails.recurrenceRule ? [eventDetails.recurrenceRule] : undefined,
            },
        });

        console.log('Event created successfully in Google Calendar:', response.data);
        return {
            googleEventId: response.data.id,
            ...response.data,
        };
    } catch (error) {
        console.error('Error creating Google Calendar event:', error.message);
        throw new Error(`Error creating Google Calendar event: ${error.message}`);
    }
}

/**
 * Function to update an existing event in the user's calendar.
 * @param {string} eventId - The ID of the event to update
 * @param {object} updates - The updated event data
 * @returns {Promise<object>} The updated event data
 */
async function updateEvent(eventId, updates) {
    try {
        const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: updates,
        });
        console.log('Event updated successfully in Google Calendar:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating Google Calendar event:', error.message);
        throw new Error(`Error updating Google Calendar event: ${error.message}`);
    }
}

/**
 * Function to get events from the user's calendar.
 * @param {string} taskId - Optional task ID to filter events
 * @param {Date} startTime - Optional start time filter
 * @param {Date} endTime - Optional end time filter
 * @returns {Promise<Array>} Array of events
 */
async function getEvents(taskId, startTime, endTime) {
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startTime ? startTime.toISOString() : new Date().toISOString(),
            timeMax: endTime ? endTime.toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days from now
            q: taskId || '', // Search for events related to the task ID (if stored in summary or description)
        });
        console.log('Events fetched successfully from Google Calendar:', response.data.items.length);
        return response.data.items;
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error.message);
        throw new Error(`Error fetching Google Calendar events: ${error.message}`);
    }
}

/**
 * Function to delete an event from the user's calendar.
 * @param {string} eventId - The ID of the event to delete
 * @returns {Promise<void>}
 */
async function deleteEvent(eventId) {
    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
        console.log('Event deleted successfully from Google Calendar:', eventId);
    } catch (error) {
        console.error('Error deleting Google Calendar event:', error.message);
        throw new Error(`Error deleting Google Calendar event: ${error.message}`);
    }
}

module.exports = {
    createEvent,
    updateEvent,
    getEvents,
    deleteEvent,
};