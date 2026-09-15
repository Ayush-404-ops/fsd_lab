import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BrowsePage from './pages/BrowsePage';
import GameDetailPage from './pages/GameDetailPage';
import CollectionPage from './pages/CollectionPage';
import AuthPage from './pages/AuthPage';
import SubmissionPage from './pages/SubmissionPage';
import './App.css';

function PageLoader() {
  return (
    <div className="page-state page-state--centered" role="status">
      Loading IndieVault…
    </div>
  );
}

function NotFoundPage() {
  return (
    <section className="page-state page-state--centered">
      <span className="eyebrow">404</span>
      <h1>That page is not in this vault.</h1>
      <p>Try browsing the catalog to find your next indie game.</p>
      <a className="btn btn--primary" href="/browse">Browse games</a>
    </section>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BrowsePage featured />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/games/:gameId" element={<GameDetailPage />} />
          <Route path="/wishlist" element={<CollectionPage kind="wishlist" />} />
          <Route path="/library" element={<CollectionPage kind="library" />} />
          <Route path="/developer/submit" element={<SubmissionPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/not-found" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span>IndieVault</span>
        <span>Curated discovery for independent games.</span>
      </footer>
    </div>
  );
}
