// client/src/components/TaskItem.js
import React from 'react';
import { updateTask, deleteTask } from '../api/api';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify'; // Import only toast (no ToastContainer)
import './TaskItem.css';

function TaskItem({ task, onDelete }) {
    const handleDelete = async () => {
        try {
            await deleteTask(task._id);
            onDelete(task._id);
            toast.success('Task deleted successfully!'); // Keep toast call
        } catch (err) {
            toast.error('Error deleting task: ' + (err.response?.data?.message || err.message)); // Keep toast call
        }
    };

    const handleInProgress = async () => {
        try {
            const updatedTask = await updateTask(task._id, { status: 'In Progress' });
            onDelete(task._id); // Refresh the list (you might want to update state directly)
            toast.success('Task moved to In Progress successfully!'); // Keep toast call
        } catch (err) {
            toast.error('Error moving task to In Progress: ' + (err.response?.data?.message || err.message)); // Keep toast call
        }
    };

    return (
        <div className="task-item">
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p>Due: {new Date(task.dueDate).toLocaleString()}</p>
            <p>Priority: {task.priority || 'Low'}</p>
            <div className="task-actions">
                <button onClick={handleInProgress}>In Progress</button>
                <button onClick={handleDelete}>Delete</button>
            </div>
        </div>
    );
};

// Define PropTypes for TaskItem
TaskItem.propTypes = {
    task: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        dueDate: PropTypes.string.isRequired,
        priority: PropTypes.string,
        status: PropTypes.string,
    }).isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default TaskItem;