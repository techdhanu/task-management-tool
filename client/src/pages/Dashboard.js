// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { getTasks } from '../api/api';
import './Dashboard.css'; // Update to correct path

function Dashboard() {
    const [taskStats, setTaskStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await getTasks();
                const stats = response.data.reduce((acc, task) => {
                    acc[task.status.toLowerCase()] = (acc[task.status.toLowerCase()] || 0) + 1;
                    return acc;
                }, { pending: 0, inProgress: 0, completed: 0 });
                setTaskStats(stats);
                setError('');
            } catch (err) {
                setError('Error fetching tasks: ' + (err.response?.data?.message || err.message));
            }
        };

        fetchTasks();
    }, []);

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            {error && <p className="error">{error}</p>}
            <div className="stats">
                <div className="stat-card">
                    <h3>Pending Tasks</h3>
                    <p>{taskStats.pending}</p>
                </div>
                <div className="stat-card">
                    <h3>In Progress Tasks</h3>
                    <p>{taskStats.inProgress}</p>
                </div>
                <div className="stat-card">
                    <h3>Completed Tasks</h3>
                    <p>{taskStats.completed}</p>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;