import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';

function App() {
    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <h1>Task Management Tool</h1>
                </header>
                <main>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/calendar" element={<Calendar />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
