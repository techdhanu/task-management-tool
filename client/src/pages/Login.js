// client/src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/api';
import { toast } from 'react-toastify';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await login({ email, password });
            console.log('Login response:', response); // Debug log
            // Store the token in localStorage
            localStorage.setItem('token', response.token);
            // Show success popup
            toast.success('Logged in successfully!');
            // Redirect to Dashboard
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Login failed';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error('Login error:', err);
        }
    };

    return (
        <div className="login">
            <h1>Login</h1>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Login</button>
            </form>
            <p>
                Don&apos;t have an account? <a href="/register">Register</a>
            </p>
        </div>
    );
}

export default Login;