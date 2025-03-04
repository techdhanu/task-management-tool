// client/src/components/TaskItem.js
import React from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import './TaskItem.css';

function TaskItem({ task, onDelete }) {
    return (
        <div className="task-item">
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p>Due: {new Date(task.dueDate).toLocaleString()}</p>
            <p>Priority: {task.priority || 'Low'}</p>
            <button onClick={() => onDelete(task._id)}>Delete</button>
        </div>
    );
};

// Define PropTypes for TaskItem
TaskItem.propTypes = {
    task: PropTypes.shape({
        _id: PropTypes.string.isRequired, // MongoDB ID, required
        title: PropTypes.string.isRequired, // Task title, required
        description: PropTypes.string.isRequired, // Task description, required
        dueDate: PropTypes.string.isRequired, // Due date as ISO string, required
        priority: PropTypes.string, // Priority (optional, defaults to 'Low' in render)
        status: PropTypes.string, // Status (optional, assumed from backend)
    }).isRequired, // task object is required
    onDelete: PropTypes.func.isRequired, // onDelete must be a function and is required
};

export default TaskItem;