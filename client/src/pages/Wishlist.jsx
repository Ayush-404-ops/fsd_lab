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
      setWishlist(data.wishlist);
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
      setActionMessage('Game removed from wishlist.');
    } catch (err) {
      setActionMessage(err.message);
    }
  };

  const handleBuy = async (gameId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/library/${gameId}`);
      setWishlist(prev => prev.filter(g => g.id !== gameId));
      setActionMessage(res.message || 'Game added to library!');
    } catch (err) {
      setActionMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="wishlist-loading">
        <div className="spinner"></div>
        <p>Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-header">
        <h1 className="wishlist-title">My Wishlist</h1>
        <p className="wishlist-subtitle">Games you're keeping an eye on.</p>
      </div>

      {actionMessage && <div className="wishlist-banner">{actionMessage}</div>}
      {error && <div className="wishlist-error">{error}</div>}

      {wishlist.length === 0 ? (
        <div className="wishlist-empty">
          <span className="empty-icon">♡</span>
          <h3>Your wishlist is empty</h3>
          <p>Explore the catalog and save games you want to play later!</p>
          <Link to="/browse" className="btn btn--primary">Browse Games</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(game => (
            <div key={game.id} className="wishlist-card-wrap">
              <GameCard game={game} />
              <div className="wishlist-card-actions">
                <button
                  className="btn btn--primary btn--sm"
                  onClick={(e) => handleBuy(game.id, e)}
                >
                  {game.price === 0 ? 'Claim Free' : `Buy ₹${game.price.toFixed(2)}`}
                </button>
                <button
                  className="btn btn--ghost btn--sm btn--danger"
                  onClick={(e) => handleRemove(game.id, e)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
