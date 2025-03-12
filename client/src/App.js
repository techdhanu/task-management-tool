// client/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import logo from './assets/task-management-logo.png';
import './styles/global.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { logout as apiLogout } from './api/api';
import PropTypes from 'prop-types';

// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }) => {
    const location = useLocation();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
    isAuthenticated: PropTypes.bool.isRequired,
};

// App Component
function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const newAuthState = !!token;
            setIsAuthenticated(newAuthState);
            console.log('Auth state updated:', newAuthState, 'Token:', token);
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            toast.success('Logged out successfully!');
            window.location.href = '/login';
        } catch (err) {
            console.error('Error logging out:', err);
            toast.error('Error logging out. Please try again.');
        }
    };

    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <Link to={isAuthenticated ? '/' : '/login'}>
                        <img src={logo} alt="Task Management Logo" className="logo" />
                    </Link>
                    <h1>Task Management Tool</h1>
                    <nav>
                        <ul>
                            {isAuthenticated ? (
                                <>
                                    <li><Link to="/">Dashboard</Link></li>
                                    <li><Link to="/tasks">Tasks</Link></li>
                                    <li><button onClick={handleLogout} className="logout-button">Logout</button></li>
                                </>
                            ) : (
                                <>
                                    <li><Link to="/login">Login</Link></li>
                                    <li><Link to="/register">Register</Link></li>
                                </>
                            )}
                        </ul>
                    </nav>
                </header>
                <main>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated}>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/tasks"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated}>
                                    <Tasks />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                </main>
                <ToastContainer />
            </div>
        </Router>
    );
}

export default App;