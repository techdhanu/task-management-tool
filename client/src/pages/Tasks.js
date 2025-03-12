// client/src/pages/Tasks.js
import React, { useState, useEffect } from 'react';
import { getTasks, createTask } from '../api/api';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import KanbanBoard from '../components/KanbanBoard';
import TaskForm from '../components/TaskForm';
import './Tasks.css';

function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [taskStats, setTaskStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await getTasks();
            console.log('Tasks page tasks response:', response);

            const normalizedTasks = response.map(task => ({
                ...task,
                status: normalizeStatus(task.status)
            }));
            console.log('Normalized tasks:', normalizedTasks);

            const stats = normalizedTasks.reduce((acc, task) => {
                const statusKey = task.status.toLowerCase().replace(' ', '');
                acc[statusKey] = (acc[statusKey] || 0) + 1;
                return acc;
            }, { pending: 0, inProgress: 0, completed: 0 });

            setTasks(normalizedTasks);
            setTaskStats(stats);
            setError('');
            toast.success('Tasks loaded successfully!');
        } catch (err) {
            const errorMessage = `Error fetching tasks: ${err.response?.data?.message || err.message || 'Server error while fetching tasks'}`;
            console.error('Error fetching tasks:', err);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const normalizeStatus = (status) => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'pending') return 'Pending';
        if (statusLower === 'in progress' || statusLower === 'inprogress') return 'In Progress';
        if (statusLower === 'completed') return 'Completed';
        return status;
    };

    const handleTaskDeleted = (taskId) => {
        setTasks(tasks.filter(task => task._id !== taskId));
        const stats = tasks.reduce((acc, task) => {
            const statusKey = task.status.toLowerCase().replace(' ', '');
            acc[statusKey] = (acc[statusKey] || 0) + 1;
            return acc;
        }, { pending: 0, inProgress: 0, completed: 0 });
        setTaskStats(stats);
    };

    const handleTaskUpdated = (updatedTask) => {
        const normalizedTask = { ...updatedTask, status: normalizeStatus(updatedTask.status) };
        setTasks(tasks.map(task => task._id === updatedTask._id ? normalizedTask : task));
        const stats = tasks.reduce((acc, task) => {
            const statusKey = task.status.toLowerCase().replace(' ', '');
            acc[statusKey] = (acc[statusKey] || 0) + 1;
            return acc;
        }, { pending: 0, inProgress: 0, completed: 0 });
        setTaskStats(stats);
    };

    const handleTaskCreated = async (taskData) => {
        try {
            const response = await createTask(taskData);
            console.log('Task created response:', response);
            const newTask = { ...response, status: normalizeStatus(response.status) };
            setTasks([...tasks, newTask]);
            const stats = { ...taskStats };
            const statusKey = newTask.status.toLowerCase().replace(' ', '');
            stats[statusKey] = (stats[statusKey] || 0) + 1;
            setTaskStats(stats);
            toast.success('Task created successfully!');
        } catch (err) {
            const errorMessage = `Error creating task: ${err.response?.data?.message || err.message || 'Server error while creating task'}`;
            console.error('Error creating task:', err);
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    if (loading) {
        return <div className="loading">Loading tasks...</div>;
    }

    return (
        <div className="tasks-page">
            <h1>Tasks</h1>
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
            <TaskForm onTaskCreated={handleTaskCreated} />
            <KanbanBoard
                tasks={tasks}
                onTaskDeleted={handleTaskDeleted}
                onTaskUpdated={handleTaskUpdated}
            />
        </div>
    );
}

Tasks.propTypes = {};

export default Tasks;