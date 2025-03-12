// client/src/components/KanbanBoard.js
import React, { useState, useEffect } from 'react';
import { updateTask, deleteTask } from '../api/api';
import TaskItem from './TaskItem';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import './KanbanBoard.css';

const KanbanBoard = ({ tasks: initialTasks, onTaskDeleted, onTaskUpdated }) => {
    const [tasks, setTasks] = useState(initialTasks || []);
    const [error, setError] = useState('');

    useEffect(() => {
        console.log('Initial tasks received:', initialTasks);
        setTasks(initialTasks || []);
    }, [initialTasks]);

    const handleTaskDeleted = async (taskId) => {
        try {
            const response = await deleteTask(taskId);
            console.log('Delete task response:', response);
            onTaskDeleted(taskId);
            setTasks(tasks.filter(task => task._id !== taskId));
            toast.success('Task deleted successfully!');
        } catch (err) {
            const errorMessage = `Error deleting task: ${err.response?.data?.message || err.message || 'Server error while deleting task'}`;
            console.error('Error deleting task:', err);
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            const response = await updateTask(taskId, { status: newStatus });
            console.log('Updated task response:', response);
            const updatedTask = response;
            if (updatedTask.status !== newStatus) {
                console.warn('Status mismatch:', updatedTask.status, 'expected:', newStatus);
                return;
            }
            setTasks(tasks.map(task => task._id === taskId ? updatedTask : task));
            if (onTaskUpdated) {
                onTaskUpdated(updatedTask);
            }
            toast.success(`Task moved to ${newStatus} successfully!`);
        } catch (err) {
            const errorMessage = `Error moving task to ${newStatus}: ${err.response?.data?.message || err.message}`;
            console.error('Error updating task status:', err);
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const renderTasks = (status) => {
        const filteredTasks = tasks.filter(task => task.status === status);
        console.log(`Tasks with status ${status}:`, filteredTasks);
        return filteredTasks.map(task => (
            <div key={task._id} className="task-item-with-actions">
                <TaskItem
                    task={{
                        ...task,
                        productivityPrediction: task.productivityPrediction || 'N/A',
                        taskbenchPrediction: task.taskbenchPrediction || 'N/A',
                        jiraTaskComplexity: task.jiraTaskComplexity || 'N/A'
                    }}
                    onDelete={handleTaskDeleted}
                />
                {status === 'Pending' && (
                    <button
                        onClick={() => handleStatusUpdate(task._id, 'In Progress')}
                        className="status-button in-progress"
                    >
                        In Progress
                    </button>
                )}
                {status === 'In Progress' && (
                    <button
                        onClick={() => handleStatusUpdate(task._id, 'Completed')}
                        className="status-button completed"
                    >
                        Completed
                    </button>
                )}
            </div>
        ));
    };

    return (
        <div className="kanban-board">
            <h1>Task Kanban Board</h1>
            {error && <p className="error">{error}</p>}
            <div className="kanban-columns">
                <div className="column pending">
                    <h2>Pending</h2>
                    {renderTasks('Pending')}
                </div>
                <div className="column in-progress">
                    <h2>In Progress</h2>
                    {renderTasks('In Progress')}
                </div>
                <div className="column completed">
                    <h2>Completed</h2>
                    {renderTasks('Completed')}
                </div>
            </div>
        </div>
    );
};

KanbanBoard.propTypes = {
    tasks: PropTypes.arrayOf(PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
        dueDate: PropTypes.string.isRequired,
        priority: PropTypes.string,
        productivityPrediction: PropTypes.string,
        taskbenchPrediction: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        jiraTaskComplexity: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })).isRequired,
    onTaskDeleted: PropTypes.func.isRequired,
    onTaskUpdated: PropTypes.func,
};

export default KanbanBoard;