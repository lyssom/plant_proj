import { RegisterPage } from './LoginRegister';
import { LoginPage } from './LoginPage';
import { GardenPage } from './GardenPage';
import UserPage from './manager/UserPage';
import PlantsManager from './manager/PlantsManager';
import ReservePage from './manager/ReserveManager';
import ContactUs from './manager/AboutUs';
import ProjectShowcase from './manager/ProjectsPage';
import Eventscase from './manager/Events';
import Research from './manager/Research';
import Partners from './manager/Partners';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import MainLayout from './MainLayout';

// ======= 整体路由入口 =======
export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<GardenPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/manage/users" element={<UserPage />} />
          <Route path="/manage/plants" element={<PlantsManager />} />
          <Route path="/manage/reservations" element={<ReservePage />} />
          <Route path="about_us" element={<ContactUs />} />
          <Route path="projects" element={<ProjectShowcase />} />
          <Route path="events" element={<Eventscase />} />
          <Route path="research" element={<Research />} />
          <Route path="partners" element={<Partners />} />
        </Route>
      </Routes>
    </Router>
  );
}
