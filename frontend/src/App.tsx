import { RegisterPage } from './LoginRegister';
import { LoginPage } from './LoginPage';
import { GardenPage } from './GardenPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// ======= 整体路由入口 =======
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GardenPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Router>
  );
}
