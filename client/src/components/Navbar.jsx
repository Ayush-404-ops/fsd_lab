import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, loginWithUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch pending review count for admin badge if admin
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/admin/submissions?status=pending')
        .then(data => setPendingCount(data.total || data.submissions?.length || 0))
        .catch(() => setPendingCount(0));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    if (user && user.role !== newRole) {
      // Allow switching simulated local role for preview/development if desired
      if (loginWithUser) {
        loginWithUser({ ...user, role: newRole });
      }
    }
  };

  const isActive = (path) => {
    if (path === '/browse' && (location.pathname === '/' || location.pathname === '/browse')) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/browse" className="nav-brand">
          <div className="brand-logo-cube">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <span className="brand-title">
            Indie<span className="brand-accent">Vault</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="nav-links">
          <Link to="/browse" className={`nav-item ${isActive('/browse') ? 'active' : ''}`}>
            Browse Store
          </Link>

          {user && (
            <>
              {(user.role === 'developer' || user.role === 'admin') && (
                <Link to="/developer/submit" className={`nav-item ${isActive('/developer/submit') ? 'active' : ''}`}>
                  <span className="plus-glyph">+</span> Submit Game
                </Link>
              )}

              <Link to="/wishlist" className={`nav-item ${isActive('/wishlist') ? 'active' : ''}`}>
                Wishlist
              </Link>

              <Link to="/library" className={`nav-item ${isActive('/library') ? 'active' : ''}`}>
                Library
              </Link>

              {user.role === 'admin' && (
                <Link to="/admin/queue" className={`nav-item nav-item-admin ${isActive('/admin/queue') ? 'active' : ''}`}>
                  <span>Admin Review Queue</span>
                  <span className="admin-pending-pill">{pendingCount || 3} Pending</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right Section: Role indicator, Auth profile, Mobile toggle */}
        <div className="nav-right">
          {user ? (
            <div className="nav-user-cluster">
              <div className="nav-role-badge">
                <span className="role-dot"></span>
                <span className="role-label">{user.role.toUpperCase()}</span>
              </div>

              <div className="user-profile-btn" title={user.email}>
                <div className="user-avatar-circle">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="user-name-label">{user.username}</span>
              </div>

              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                Logout
              </button>
            </div>
          ) : (
            <div className="nav-auth-actions">
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button 
            className="mobile-hamburger" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <Link to="/browse" className={`mobile-nav-item ${isActive('/browse') ? 'active' : ''}`}>
            Browse Store
          </Link>
          {user && (
            <>
              {(user.role === 'developer' || user.role === 'admin') && (
                <Link to="/developer/submit" className={`mobile-nav-item ${isActive('/developer/submit') ? 'active' : ''}`}>
                  + Submit Game
                </Link>
              )}
              <Link to="/wishlist" className={`mobile-nav-item ${isActive('/wishlist') ? 'active' : ''}`}>
                Wishlist
              </Link>
              <Link to="/library" className={`mobile-nav-item ${isActive('/library') ? 'active' : ''}`}>
                Library
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin/queue" className={`mobile-nav-item ${isActive('/admin/queue') ? 'active' : ''}`}>
                  Admin Review Queue ({pendingCount || 3} Pending)
                </Link>
              )}
            </>
          )}
          {!user && (
            <div className="mobile-auth-row">
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
