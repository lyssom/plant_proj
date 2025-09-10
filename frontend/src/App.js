import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(Router, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(MainLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(GardenPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/manage/users", element: _jsx(UserPage, {}) }), _jsx(Route, { path: "/manage/plants", element: _jsx(PlantsManager, {}) }), _jsx(Route, { path: "/manage/reservations", element: _jsx(ReservePage, {}) }), _jsx(Route, { path: "about_us", element: _jsx(ContactUs, {}) }), _jsx(Route, { path: "projects", element: _jsx(ProjectShowcase, {}) }), _jsx(Route, { path: "events", element: _jsx(Eventscase, {}) }), _jsx(Route, { path: "research", element: _jsx(Research, {}) }), _jsx(Route, { path: "partners", element: _jsx(Partners, {}) })] }) }) }));
}
