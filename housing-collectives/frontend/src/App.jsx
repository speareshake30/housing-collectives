import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage/HomePage';
import CollectivesPage from './pages/CollectivesPage/CollectivesPage';
import CollectiveDetailPage from './pages/CollectiveDetailPage/CollectiveDetailPage';
import EventsPage from './pages/EventsPage/EventsPage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collectives" element={<CollectivesPage />} />
        <Route path="/collectives/:slug" element={<CollectiveDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
      </Routes>
    </Layout>
  );
}

export default App;
