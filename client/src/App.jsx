import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Browse from './pages/Browse';
import GameDetail from './pages/GameDetail';
import Wishlist from './pages/Wishlist';
import Library from './pages/Library';
import SubmitGame from './pages/SubmitGame';
import AdminReviewQueue from './pages/AdminReviewQueue';
import { Login, Register } from './pages/Auth';
import './App.css';

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/games/:id" element={<GameDetail />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/library" element={<Library />} />
          <Route path="/developer/submit" element={<SubmitGame />} />
          <Route path="/admin/queue" element={<AdminReviewQueue />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/browse" replace />} />
        </Routes>
      </main>
    </div>
  );
}
