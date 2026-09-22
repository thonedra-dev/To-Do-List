import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Pages/Dashboard';
import LoginRegister from './Pages/LoginRegister';
import UserProfile from './Pages/UserProfile';
import ProjectCreator from './Pages/ProjectCreator';
import Calendar from './Pages/Calendar';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<LoginRegister />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/project/new" element={<ProjectCreator />} />
        <Route path="/calendar" element={<Calendar />} />
      </Routes>
    </BrowserRouter>
  );
}