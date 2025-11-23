import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './layouts/Layout'
import Home from './pages/Home'
import Record from './pages/Record'
import History from './pages/History'
import Analysis from './pages/Analysis'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import Login from './pages/Login'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/record" element={<Record onSaved={() => {}} />} />
            <Route path="/history" element={<History />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

