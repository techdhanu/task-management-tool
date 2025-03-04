// client/src/components/KanbanBoard.js
import React, { useEffect, useState } from 'react';
import { getTasks, deleteTask } from '../api/api';
import TaskItem from './TaskItem'; // Assume TaskItem exists or create it
import './KanbanBoard.css'; // Update to correct path

const KanbanBoard = () => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await getTasks();
                setTasks(response.data);
                setError('');
            } catch (err) {
                setError('Error fetching tasks: ' + (err.response?.data?.message || err.message));
            }
        };

        fetchTasks();
    }, []);

    const handleTaskDeleted = async (taskId) => {
        try {
            await deleteTask(taskId);
            setTasks(tasks.filter(task => task._id !== taskId));
            setError('');
        } catch (err) {
            setError('Error deleting task: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="kanban-board">
            <h1>Task Kanban Board</h1>
            {error && <p className="error">{error}</p>}
            <div className="kanban-columns">
                <div className="column pending">
                    <h2>Pending</h2>
                    {tasks.filter(task => task.status === 'Pending').map(task => (
                        <TaskItem key={task._id} task={task} onDelete={handleTaskDeleted} />
                    ))}
                </div>
                <div className="column in-progress">
                    <h2>In Progress</h2>
                    {tasks.filter(task => task.status === 'In Progress').map(task => (
                        <TaskItem key={task._id} task={task} onDelete={handleTaskDeleted} />
                    ))}
                </div>
                <div className="column completed">
                    <h2>Completed</h2>
                    {tasks.filter(task => task.status === 'Completed').map(task => (
                        <TaskItem key={task._id} task={task} onDelete={handleTaskDeleted} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KanbanBoard;