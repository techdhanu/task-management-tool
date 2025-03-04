// client/src/components/KanbanBoard.js
import React, { useEffect, useState } from 'react';
import { getTasks, updateTask, deleteTask } from '../api/api';
import TaskItem from './TaskItem';
import { toast } from 'react-toastify'; // Import only toast (no ToastContainer)
import './KanbanBoard.css';

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

    const handleTaskDeleted = (taskId) => {
        setTasks(tasks.filter(task => task._id !== taskId));
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            const updatedTask = await updateTask(taskId, { status: newStatus });
            setTasks(tasks.map(task => task._id === taskId ? updatedTask.data : task)); // Update state with new task
            toast.success(`Task moved to ${newStatus} successfully!`);
        } catch (err) {
            toast.error(`Error moving task to ${newStatus}: ` + (err.response?.data?.message || err.message));
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
                        <div key={task._id} className="task-item-with-actions">
                            <TaskItem task={task} onDelete={handleTaskDeleted} />
                            <button onClick={() => handleStatusUpdate(task._id, 'Completed')}>Completed</button>
                        </div>
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