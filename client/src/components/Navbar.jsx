import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🎮</span>
          <span className="brand-text">IndieVault</span>
        </Link>

        <div className="navbar-links">
          <Link to="/browse" className="nav-link">Browse</Link>
          {user && (
            <>
              <Link to="/wishlist" className="nav-link">
                <span className="nav-icon">♡</span> Wishlist
              </Link>
              <Link to="/library" className="nav-link">
                <span className="nav-icon">📚</span> Library
              </Link>
              {(user.role === 'developer' || user.role === 'admin') && (
                <Link to="/developer/submit" className="nav-link nav-link--dev">
                  <span className="nav-icon">+</span> Submit Game
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin/queue" className="nav-link nav-link--admin">
                  <span className="nav-icon">🛡️</span> Admin Queue
                </Link>
              )}
            </>
          )}
        </div>

        <div className="navbar-auth">
          {user ? (
            <div className="user-menu">
              <span className="user-greeting">
                <span className="user-role-badge">{user.role}</span>
                {user.username}
              </span>
              <button onClick={handleLogout} className="btn btn--ghost btn--sm">Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn--ghost btn--sm">Log in</Link>
              <Link to="/register" className="btn btn--primary btn--sm">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
