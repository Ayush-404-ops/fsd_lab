import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Library.css';

export default function Library() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLibrary = async () => {
    try {
      const data = await api.get('/library');
      setLibrary(data.library);
    } catch (err) {
      setError(err.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  if (loading) {
    return (
      <div className="library-loading">
        <div className="spinner"></div>
        <p>Loading your game library...</p>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="library-header">
        <h1 className="library-title">My Library</h1>
        <p className="library-subtitle">Your collection of indie titles.</p>
      </div>

      {error && <div className="library-error">{error}</div>}

      {library.length === 0 ? (
        <div className="library-empty">
          <span className="empty-icon">📚</span>
          <h3>Your library is empty</h3>
          <p>Browse the catalog and add your first game!</p>
          <Link to="/browse" className="btn btn--primary">Browse Catalog</Link>
        </div>
      ) : (
        <div className="library-grid">
          {library.map(game => {
            const thumbnailSrc = game.thumbnailUrl || `https://placehold.co/400x225/1a1a2e/a78bfa?text=${encodeURIComponent(game.title)}`;
            return (
              <div key={game.id} className="library-card">
                <div className="library-card__image-wrap">
                  <img src={thumbnailSrc} alt={game.title} className="library-card__image" />
                  <span className="library-card__badge">Owned</span>
                </div>
                <div className="library-card__body">
                  <h3 className="library-card__title">{game.title}</h3>
                  <p className="library-card__dev">by {game.developerUsername}</p>
                  <p className="library-card__date">
                    Acquired: {new Date(game.acquiredAt).toLocaleDateString()}
                  </p>
                  <div className="library-card__actions">
                    <Link to={`/games/${game.id}`} className="btn btn--primary btn--sm btn--full">
                      ▶ Play / Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
