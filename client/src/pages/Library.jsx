import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Library.css';

export default function Library() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadNotice, setDownloadNotice] = useState('');

  const fetchLibrary = async () => {
    try {
      const data = await api.get('/library');
      const list = data.library || [];
      if (list.length === 0) {
        // Provide sample owned title for demo if library is empty
        setLibrary([
          {
            id: 1,
            title: 'Dungeon Baker: Pastry Quest',
            developerUsername: 'Croissant Coven',
            thumbnailUrl: '/images/dungeon-baker.png',
            version: 'v1.0.2',
            hoursPlayed: '14.2 hrs',
            acquiredAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
          }
        ]);
      } else {
        setLibrary(list);
      }
    } catch (err) {
      setError(err.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleDownload = (gameTitle) => {
    setDownloadNotice(`✓ Initiating DRM-free standalone build package download for ${gameTitle}...`);
    setTimeout(() => setDownloadNotice(''), 4000);
  };

  if (loading) {
    return (
      <div className="library-container">
        <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  return (
    <div className="library-container">
      <div className="library-header">
        <div className="library-title-cluster">
          <h1 className="library-title">My Indie Library</h1>
          <span className="library-count-badge">{library.length} Titles Owned</span>
        </div>
        <p className="library-subtitle">
          Your permanent DRM-free licenses. Download standalone binaries or inspect community updates.
        </p>
      </div>

      {downloadNotice && (
        <div className="download-alert">
          <span>📥</span> {downloadNotice}
        </div>
      )}

      {error && <div className="alert-box error">{error}</div>}

      {library.length === 0 ? (
        <div className="library-empty-card">
          <div className="empty-icon">📚</div>
          <h3>Your Library is Empty</h3>
          <p>Explore the store catalog and acquire your first verified indie title!</p>
          <Link to="/browse" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Browse Indie Games
          </Link>
        </div>
      ) : (
        <div className="library-grid">
          {library.map(game => {
            const thumb = game.thumbnailUrl || (game.id === 1 ? '/images/dungeon-baker.png' : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80');
            return (
              <div key={game.id} className="library-item-card">
                <div className="library-thumb-wrap">
                  <img src={thumb} alt={game.title} className="library-thumb-img" />
                  <span className="owned-license-pill">DRM-Free Standalone</span>
                </div>

                <div className="library-card-content">
                  <h3 className="library-card-title">{game.title}</h3>
                  <span className="library-card-dev">by {game.developerUsername || 'Independent'}</span>

                  <div className="library-meta-tags">
                    <span className="meta-pill">{game.version || 'v1.0.2 Stable'}</span>
                    <span className="meta-pill">{game.hoursPlayed || 'Steam Deck Ready'}</span>
                  </div>

                  <div className="library-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownload(game.title)}
                    >
                      <span>📥 Download Build</span>
                    </button>
                    <Link to={`/games/${game.id}`} className="btn btn-secondary btn-sm">
                      <span>Inspect Details</span>
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
