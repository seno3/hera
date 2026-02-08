import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Company from './pages/Company';
import Profile from './pages/Profile';

export default function App() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/company/:ticker" element={<Company />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}
