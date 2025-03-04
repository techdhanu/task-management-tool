// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskCalendar from './pages/TaskCalendar';
import NotFound from './pages/NotFound';
import logo from './assets/task-management-logo.png'; // Verify file name and path
import './styles/global.css';

function App() {
    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <Link to="/">
                        <img src={logo} alt="Task Management Logo" className="logo" />
                    </Link>
                    <h1>Task Management Tool</h1>
                    <nav>
                        <ul>
                            <li><Link to="/">Dashboard</Link></li>
                            <li><Link to="/tasks">Tasks</Link></li>
                            <li><Link to="/calendar">Calendar</Link></li>
                        </ul>
                    </nav>
                </header>
                <main>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/calendar" element={<TaskCalendar />} />
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;