import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';
import LandingPage from './LandingPage';
import Register from './Register';
import { Toaster } from 'sonner';
import AuthSuccess from './AuthSuccess';
import { ThemeProvider } from './ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
        </Routes>
        <Toaster position="top-right" theme="dark" richColors />
      </Router>
    </ThemeProvider>
  );
}

export default App;