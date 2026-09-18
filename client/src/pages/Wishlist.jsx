import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import GameCard from '../components/GameCard';
import './Wishlist.css';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchWishlist = async () => {
    try {
      const data = await api.get('/wishlist');
      setWishlist(data.wishlist || []);
    } catch (err) {
      setError(err.message || 'Failed to load wishlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (gameId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/wishlist/${gameId}`);
      setWishlist(prev => prev.filter(g => g.id !== gameId));
      setActionMessage('Removed title from wishlist.');
    } catch (err) {
      setActionMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="wishlist-container">
        <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  return (
    <div className="wishlist-container">
      <div className="wishlist-header">
        <div className="wishlist-title-cluster">
          <h1 className="wishlist-title">My Wishlist</h1>
          <span className="wishlist-count-badge">{wishlist.length} Bookmarks</span>
        </div>
        <p className="wishlist-subtitle">
          Track upcoming titles, price reductions, and community synthesis reports.
        </p>
      </div>

      {actionMessage && (
        <div className="wishlist-action-banner">
          <span>✓</span> {actionMessage}
        </div>
      )}

      {error && <div className="alert-box error">{error}</div>}

      {wishlist.length === 0 ? (
        <div className="wishlist-empty-card">
          <div className="empty-icon">♡</div>
          <h3>Your Wishlist is Empty</h3>
          <p>Explore the store catalog and bookmark games you want to track or acquire later.</p>
          <Link to="/browse" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Browse Indie Games
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(game => (
            <div key={game.id} className="wishlist-item-wrapper">
              <GameCard game={game} />
              <div className="wishlist-quick-actions">
                <Link to={`/games/${game.id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  Inspect &amp; Buy
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => handleRemove(game.id, e)}
                  title="Remove from wishlist"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
