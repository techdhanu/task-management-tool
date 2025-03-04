// client/src/pages/TaskCalendar.js
import React, { useState, useEffect } from 'react';
import { getCalendarEvents } from '../api/api';
import './TaskCalendar.css'; // Update to correct path

function TaskCalendar() {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await getCalendarEvents();
                setEvents(response.data);
                setError('');
            } catch (err) {
                setError('Error fetching calendar events: ' + (err.response?.data?.message || err.message));
            }
        };

        fetchEvents();
    }, []);

    return (
        <div className="task-calendar">
            <h1>Task Calendar</h1>
            {error && <p className="error">{error}</p>}
            <div className="calendar-view">
                {events.map(event => (
                    <div key={event.id} className="calendar-event">
                        <h3>{event.summary}</h3>
                        <p>{event.description}</p>
                        <p>{new Date(event.start.dateTime).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TaskCalendar;