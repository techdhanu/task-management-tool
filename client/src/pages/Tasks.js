// client/src/pages/Tasks.js
import React, { useState } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import TaskForm from '../components/TaskForm';
import './Tasks.css';

function Tasks() {
    const [error, setError] = useState('');

    const handleTaskCreated = (newTask) => {
        // Optionally refresh tasks here or handle in KanbanBoard
        setError('');
    };

    return (
        <div className="tasks-page">
            <h1>Tasks</h1>
            {error && <p className="error">{error}</p>}
            <TaskForm onTaskCreated={handleTaskCreated} />
            <KanbanBoard />
        </div>
    );
}

export default Tasks;