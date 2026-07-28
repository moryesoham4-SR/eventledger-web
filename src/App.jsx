import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { EventProvider } from './context/EventContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Budget from './pages/Budget'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Vendors from './pages/Vendors'
import Sponsors from './pages/Sponsors'
import Departments from './pages/Departments'
import Notifications from './pages/Notifications'
import Users from './pages/Users'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              element={
                <ProtectedRoute>
                  <EventProvider>
                    <Layout />
                  </EventProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/income" element={<Income />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/sponsors" element={<Sponsors />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
