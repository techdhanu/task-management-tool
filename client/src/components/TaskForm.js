// client/src/components/TaskForm.js
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createTask } from '../api/api';
import PropTypes from 'prop-types'; // Import PropTypes
import './TaskForm.css';

const TaskForm = ({ onTaskCreated }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [error, setError] = useState('');

    const onSubmit = async (data) => {
        try {
            const response = await createTask({
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
                priority: data.priority || '',
                additionalData: {
                    attendees: parseInt(data.attendees) || 0,
                    budget: parseInt(data.budget) || 0,
                    preparationTime: parseInt(data.preparationTime) || 0,
                    venueSize: data.venueSize || '',
                    cateringRequired: data.cateringRequired === 'true',
                    entertainmentRequired: data.entertainmentRequired === 'true',
                    decorationsRequired: data.decorationsRequired === 'true',
                },
            });
            onTaskCreated(response.data);
            reset();
            setError('');
        } catch (err) {
            setError('Error creating task: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="task-form">
            <input
                type="text"
                placeholder="Task Title"
                {...register('title', { required: 'Title is required' })}
                aria-invalid={errors.title ? "true" : "false"}
            />
            {errors.title && <p className="error">{errors.title.message}</p>}

            <input
                type="text"
                placeholder="Task Description"
                {...register('description', { required: 'Description is required' })}
            />
            {errors.description && <p className="error">{errors.description.message}</p>}

            <input
                type="datetime-local"
                {...register('dueDate', { required: 'Due Date is required' })}
            />
            {errors.dueDate && <p className="error">{errors.dueDate.message}</p>}

            <input
                type="text"
                placeholder="Priority (Low/Medium/High)"
                {...register('priority')}
            />

            <input
                type="number"
                placeholder="Attendees"
                {...register('attendees')}
            />

            <input
                type="number"
                placeholder="Budget"
                {...register('budget')}
            />

            <input
                type="number"
                placeholder="Preparation Time (days)"
                {...register('preparationTime')}
            />

            <select {...register('venueSize')}>
                <option value="">Select Venue Size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
            </select>

            <label>
                <input type="checkbox" {...register('cateringRequired')} value="true" /> Catering Required
            </label>

            <label>
                <input type="checkbox" {...register('entertainmentRequired')} value="true" /> Entertainment Required
            </label>

            <label>
                <input type="checkbox" {...register('decorationsRequired')} value="true" /> Decorations Required
            </label>

            {error && <p className="error">{error}</p>}
            <button type="submit">Add Task</button>
        </form>
    );
};

// Define PropTypes for TaskForm
TaskForm.propTypes = {
    onTaskCreated: PropTypes.func.isRequired, // onTaskCreated must be a function and is required
};

export default TaskForm;