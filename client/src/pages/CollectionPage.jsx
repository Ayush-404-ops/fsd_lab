import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import GameCard from '../components/GameCard';
import './pages.css';

function CollectionPage({ kind = 'wishlist' }) {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const isWishlist = kind === 'wishlist';
  const label = isWishlist ? 'Wishlist' : 'Library';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api.get(isWishlist ? '/wishlist' : '/library')
      .then((data) => {
        if (active) setGames(data[isWishlist ? 'wishlist' : 'library'] || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || `Unable to load your ${label.toLowerCase()}.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isWishlist, user, label]);

  const removeFromWishlist = async (gameId) => {
    try {
      await api.delete(`/wishlist/${gameId}`);
      setGames((current) => current.filter((game) => game.id !== gameId));
    } catch (requestError) {
      setError(requestError.message || 'Unable to remove that game.');
    }
  };

  if (!user) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state__icon">{isWishlist ? '♡' : '▣'}</div>
          <p className="eyebrow">Your {label.toLowerCase()}</p>
          <h1>Sign in to see your games.</h1>
          <p>Save discoveries to your personal shelf and come back to them anytime.</p>
          <Link className="btn btn--primary" to={`/login?redirect=/${isWishlist ? 'wishlist' : 'library'}`}>Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container collection-page">
      <section className="collection-hero">
        <p className="eyebrow">{isWishlist ? 'Saved for later' : 'Your collection'}</p>
        <h1>{label}</h1>
        <p className="page-lede">
          {isWishlist ? 'Games you want to remember, revisit, and maybe make yours.' : 'Every game you have added to your IndieVault shelf.'}
        </p>
      </section>

      {error && <div className="notice notice--error" role="alert">{error}</div>}
      {loading && <div className="loading-state">Loading your {label.toLowerCase()}...</div>}
      {!loading && !error && games.length === 0 && (
        <div className="empty-state empty-state--compact">
          <div className="empty-state__icon">{isWishlist ? '♡' : '▣'}</div>
          <h2>{isWishlist ? 'Your wishlist is waiting.' : 'Your library is empty.'}</h2>
          <p>{isWishlist ? 'Browse the catalog and save a few games for later.' : 'Find a game you love and add it to your library.'}</p>
          <Link className="btn btn--ghost" to="/browse">Browse games</Link>
        </div>
      )}
      {!loading && games.length > 0 && (
        <div className="collection-grid">
          {games.map((game) => (
            <div className="collection-item" key={game.id}>
              <GameCard game={game} />
              {isWishlist && (
                <button className="collection-item__remove" type="button" onClick={() => removeFromWishlist(game.id)}>
                  Remove from wishlist
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CollectionPage;