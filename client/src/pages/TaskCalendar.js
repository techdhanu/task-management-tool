// client/src/pages/TaskCalendar.js
import React, { useState, useEffect } from 'react';
import { getCalendarEvents } from '../api/api';
import './TaskCalendar.css';

function TaskCalendar() {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await getCalendarEvents();
                console.log('Calendar events response:', response.data); // Debug log
                if (!Array.isArray(response.data)) {
                    console.warn('Unexpected response format:', response.data);
                    setEvents([]); // Fallback to empty array if response is not an array
                } else {
                    setEvents(response.data);
                }
                setError('');
            } catch (err) {
                const errorMessage = err.response?.data?.message || err.message || 'Unable to fetch calendar events';
                console.error('Error fetching calendar events:', err, err.response?.data);
                setError(errorMessage);
                setEvents([]); // Ensure events are cleared on error
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.startTime || event.start?.dateTime); // Handle nested startTime
        const now = new Date();

        if (filter === 'upcoming') return eventDate > now;
        if (filter === 'past') return eventDate < now;
        return true;
    });

    const renderEventStatus = (event) => {
        const startDate = new Date(event.startTime || event.start?.dateTime); // Handle nested startTime
        const now = new Date();

        if (startDate > now) return 'Upcoming';
        if (startDate < now) return 'Past';
        return 'Today';
    };

    if (loading) {
        return <div className="loading">Loading calendar events...</div>;
    }

    return (
        <div className="task-calendar">
            <div className="calendar-filters">
                {['All Events', 'Upcoming', 'Past Events'].map((filterName) => {
                    const filterKey = filterName.toLowerCase().replace(' ', '');
                    return (
                        <button
                            key={filterKey}
                            onClick={() => setFilter(filterKey)}
                            className={filter === filterKey ? 'active' : ''}
                        >
                            {filterName}
                        </button>
                    );
                })}
            </div>

            {error && <div className="error">{error}</div>}

            <div className="calendar-view">
                {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => (
                        <div
                            key={event._id || event.googleEventId}
                            className={`calendar-event ${renderEventStatus(event).toLowerCase()}`}
                        >
                            <div className="event-header">
                                <h3>{event.title}</h3>
                                <span className="event-status">
                                    {renderEventStatus(event)}
                                </span>
                            </div>
                            <p>{event.description || 'No description'}</p>
                            <div className="event-details">
                                <p>
                                    <strong>Start:</strong> {new Date(event.startTime || event.start?.dateTime).toLocaleString()}
                                </p>
                                <p>
                                    <strong>End:</strong> {new Date(event.endTime || event.end?.dateTime).toLocaleString()}
                                </p>
                                {event.location && (
                                    <p>
                                        <strong>Location:</strong> {event.location}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-events">No calendar events found.</p>
                )}
            </div>
        </div>
    );
}

export default TaskCalendar;