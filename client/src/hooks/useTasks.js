import { useState, useEffect } from 'react';
import { getTasks } from '../api/api';

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await getTasks();
                setTasks(response.data);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    return { tasks, loading, error, setTasks };
}