import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ReviewForm, ReviewList } from '../components/Reviews';
import './pages.css';

function GameDetailPage() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [inWishlist, setInWishlist] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [reviewRefresh, setReviewRefresh] = useState(0);

  const loadGame = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const gameResponse = await api.get(`/games/${gameId}`);
      setGame(gameResponse.game);

      if (user) {
        const [wishlistResponse, libraryResponse] = await Promise.all([
          api.get('/wishlist'),
          api.get('/library')
        ]);
        setInWishlist((wishlistResponse.wishlist || []).some((item) => String(item.id) === String(gameId)));
        setInLibrary((libraryResponse.library || []).some((item) => String(item.id) === String(gameId)));
      } else {
        setInWishlist(false);
        setInLibrary(false);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load this game.');
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const requireLogin = () => {
    navigate(`/login?redirect=${encodeURIComponent(`/games/${gameId}`)}`);
  };

  const toggleWishlist = async () => {
    if (!user) {
      requireLogin();
      return;
    }
    setAction('wishlist');
    setError('');
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/${gameId}`);
        setInWishlist(false);
      } else {
        await api.post(`/wishlist/${gameId}`, {});
        setInWishlist(true);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to update your wishlist.');
    } finally {
      setAction('');
    }
  };

  const addToLibrary = async () => {
    if (!user) {
      requireLogin();
      return;
    }
    if (inLibrary) return;
    setAction('library');
    setError('');
    try {
      await api.post(`/library/${gameId}`, {});
      setInLibrary(true);
      setInWishlist(false);
    } catch (requestError) {
      setError(requestError.message || 'Unable to add this game to your library.');
    } finally {
      setAction('');
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading-state">Loading game details...</div></div>;
  }

  if (error && !game) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state__icon">!</div>
          <h1>Game not found</h1>
          <p>{error}</p>
          <Link className="btn btn--primary" to="/browse">Back to browse</Link>
        </div>
      </div>
    );
  }

  if (!game) return null;
  const image = game.bannerUrl || game.thumbnailUrl || `https://placehold.co/1400x520/17152b/c4b5fd?text=${encodeURIComponent(game.title)}`;

  return (
    <div className="page-container detail-page">
      <Link className="back-link" to="/browse">← Back to browse</Link>
      <section className="detail-hero" style={{ '--detail-image': `url("${image}")` }}>
        <div className="detail-hero__scrim" />
        <div className="detail-hero__content">
          <p className="eyebrow">IndieVault discovery</p>
          <h1>{game.title}</h1>
          <p className="detail-hero__developer">Created by {game.developerUsername || 'an independent developer'}</p>
        </div>
      </section>

      {error && <div className="notice notice--error" role="alert">{error}</div>}

      <div className="detail-layout">
        <main className="detail-main">
          <section className="detail-card">
            <div className="detail-card__heading">
              <div>
                <p className="eyebrow">About the game</p>
                <h2>{game.primaryGenre || 'Independent game'}</h2>
              </div>
              <span className="detail-price">{Number(game.price) === 0 ? 'Free' : `₹${Number(game.price).toFixed(2)}`}</span>
            </div>
            <p className="detail-description">{game.description || 'This developer has not added a description yet.'}</p>
            {game.tags?.length > 0 && (
              <div className="detail-tags">
                {game.tags.map((tag) => <span className="detail-tag" key={tag}>{tag}</span>)}
              </div>
            )}
          </section>

          <section className="detail-card">
            <ReviewList key={reviewRefresh} gameId={gameId} />
            <ReviewForm
              gameId={gameId}
              onReviewSubmitted={() => setReviewRefresh((value) => value + 1)}
            />
          </section>
        </main>

        <aside className="detail-sidebar">
          <div className="action-card">
            <p className="eyebrow">Add to your shelf</p>
            <h2>{inLibrary ? 'Already in your library' : 'Keep this one close.'}</h2>
            <button
              className="btn btn--primary btn--wide"
              type="button"
              disabled={inLibrary || action === 'library'}
              onClick={addToLibrary}
            >
              {inLibrary ? '✓ In your library' : action === 'library' ? 'Adding...' : Number(game.price) === 0 ? 'Add to library' : 'Get this game'}
            </button>
            <button className={`btn btn--wide ${inWishlist ? 'btn--active' : 'btn--ghost'}`} type="button" disabled={action === 'wishlist'} onClick={toggleWishlist}>
              {action === 'wishlist' ? 'Updating...' : inWishlist ? '♥ Remove from wishlist' : '♡ Add to wishlist'}
            </button>
            {!user && <p className="action-card__hint">Log in to save games and write reviews.</p>}
          </div>
          <div className="detail-meta">
            <div><span>Status</span><strong>{game.status}</strong></div>
            <div><span>Released</span><strong>{game.releaseDate ? new Date(game.releaseDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'Recently'}</strong></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default GameDetailPage;