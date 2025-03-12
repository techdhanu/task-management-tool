// server/services/calendarService.js (Updated with more logs)
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const CalendarEvent = require('../models/CalendarEvent'); // Import CalendarEvent model

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
    console.log('Google Calendar authentication initialized successfully for:', keyFile.client_email);
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

        console.log('Attempting to create Google Calendar event:', eventDetails);
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
        console.error('Error creating Google Calendar event:', error.message, error.stack);
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
        console.log('Attempting to update Google Calendar event:', eventId, updates);
        const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: updates,
        });
        console.log('Event updated successfully in Google Calendar:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating Google Calendar event:', error.message, error.stack);
        throw new Error(`Error updating Google Calendar event: ${error.message}`);
    }
}

/**
 * Function to get events from the user's calendar and local database.
 * @returns {Promise<Array>} Array of combined local and Google Calendar events
 */
async function getEvents() {
    try {
        // Fetch local calendar events
        const localEvents = await CalendarEvent.find().sort({ startTime: 1 }); // Sort by start time
        console.log('Local calendar events fetched:', localEvents.length, localEvents);

        // Fetch Google Calendar events (optional, with a 5-second timeout for performance)
        let googleEvents = [];
        try {
            console.log('Attempting to fetch Google Calendar events...');
            const googleResponse = await Promise.race([
                calendar.events.list({
                    calendarId: 'primary',
                    timeMin: new Date().toISOString(),
                    maxResults: 50, // Limit results for performance
                    orderBy: 'startTime',
                    singleEvents: true,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar timeout after 5s')), 5000))
            ]);
            googleEvents = googleResponse.data.items || [];
            console.log('Google Calendar events fetched:', googleEvents.length, googleEvents);
        } catch (googleError) {
            console.error('Error fetching Google Calendar events:', googleError.message, googleError.stack);
            // Continue with local events even if Google fails
        }

        // Combine and deduplicate events (match by title and start time, prioritize local events)
        const combinedEvents = localEvents.map(localEvent => ({
            _id: localEvent._id,
            taskId: localEvent.taskId,
            title: localEvent.title,
            description: localEvent.description || '',
            startTime: localEvent.startTime,
            endTime: localEvent.endTime,
            location: localEvent.location,
            allDay: localEvent.allDay,
            recurring: localEvent.recurring,
            googleEventId: localEvent.googleEventId,
        }));

        // Add Google events that don’t match local events (avoid duplicates)
        googleEvents.forEach(googleEvent => {
            if (!combinedEvents.some(event => event.googleEventId === googleEvent.id)) {
                combinedEvents.push({
                    title: googleEvent.summary || 'Unnamed Event',
                    description: googleEvent.description || '',
                    startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
                    endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
                    location: googleEvent.location || 'N/A',
                    allDay: !googleEvent.start.dateTime, // If no dateTime, assume all-day
                    recurring: !!googleEvent.recurrence, // Check for recurrence
                    googleEventId: googleEvent.id,
                });
            }
        });

        console.log('Combined calendar events:', combinedEvents.length, combinedEvents);
        return combinedEvents.sort((a, b) => a.startTime - b.startTime); // Sort by start time
    } catch (error) {
        console.error('Error fetching combined calendar events:', error.message, error.stack);
        throw new Error(`Error fetching calendar events: ${error.message}`);
    }
}

/**
 * Function to delete an event from the user's calendar.
 * @param {string} eventId - The ID of the event to delete
 * @returns {Promise<void>}
 */
async function deleteEvent(eventId) {
    try {
        console.log('Attempting to delete Google Calendar event:', eventId);
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
        console.log('Event deleted successfully from Google Calendar:', eventId);
    } catch (error) {
        console.error('Error deleting Google Calendar event:', error.message, error.stack);
        throw new Error(`Error deleting Google Calendar event: ${error.message}`);
    }
}

module.exports = {
    createEvent,
    updateEvent,
    getEvents,
    deleteEvent,
};