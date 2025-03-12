// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { getTasks } from '../api/api';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import './Dashboard.css';

function Dashboard() {
    const [taskStats, setTaskStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await getTasks();
            console.log('Dashboard tasks response:', response); // Debug log

            // Calculate stats based on status
            const stats = response.reduce((acc, task) => {
                const statusKey = task.status.toLowerCase().replace(' ', '');
                acc[statusKey] = (acc[statusKey] || 0) + 1;
                return acc;
            }, { pending: 0, inProgress: 0, completed: 0 });

            setTaskStats(stats);
            setError('');
            toast.success('Dashboard updated with task statistics!');
        } catch (err) {
            const errorMessage = `Error fetching tasks: ${err.response?.data?.message || err.message || 'Server error while fetching tasks'}`;
            console.error('Error fetching tasks:', err);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

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

Dashboard.propTypes = {
    // No props currently, but this can be extended
};

export default Dashboard;