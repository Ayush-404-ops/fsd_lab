import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ReviewList, ReviewForm } from '../components/Reviews';
import './GameDetail.css';

export default function GameDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Wishlist & Library state
  const [inWishlist, setInWishlist] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // AI Review Summary state
  const [aiSummary, setAiSummary] = useState(null);

  // Refresh trigger for reviews
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const fetchGameDetails = useCallback(async () => {
    try {
      const data = await api.get(`/games/${id}`);
      setGame(data.game);
    } catch (err) {
      setError(err.message || 'Game not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch cached AI Review Summary from /api/ai/summary/:id
  const fetchAISummary = useCallback(async () => {
    try {
      const data = await api.get(`/ai/summary/${id}`);
      if (data.status === 'insufficient_data') {
        setAiSummary(null); // Less than 5 reviews -> fall back to raw review list
      } else if (data.summary && !data.summary.isFallback) {
        setAiSummary(data.summary);
      } else {
        setAiSummary(null); // Fallback response -> fall back to raw stats
      }
    } catch (err) {
      console.warn('AI review summary unavailable:', err.message);
      setAiSummary(null);
    }
  }, [id]);

  // Check wishlist & library status if user is logged in
  const checkUserStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [wRes, lRes] = await Promise.all([
        api.get(`/wishlist/check/${id}`).catch(() => ({ inWishlist: false })),
        api.get(`/library/check/${id}`).catch(() => ({ inLibrary: false }))
      ]);
      setInWishlist(wRes.inWishlist);
      setInLibrary(lRes.inLibrary);
    } catch (err) {
      console.error('Failed to check user wishlist/library status:', err);
    }
  }, [id, user]);

  useEffect(() => {
    fetchGameDetails();
    checkUserStatus();
    fetchAISummary();
  }, [fetchGameDetails, checkUserStatus, fetchAISummary, reviewRefreshKey]);

  const toggleWishlist = async () => {
    if (!user) { setActionMessage('Please log in to add to wishlist.'); return; }
    setWishlistLoading(true);
    setActionMessage('');
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/${id}`);
        setInWishlist(false);
        setActionMessage('Removed from wishlist.');
      } else {
        await api.post(`/wishlist/${id}`);
        setInWishlist(true);
        setActionMessage('Added to wishlist!');
      }
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) { setActionMessage('Please log in to purchase.'); return; }
    setPurchaseLoading(true);
    setActionMessage('');
    try {
      const res = await api.post(`/library/${id}`);
      setInLibrary(true);
      setInWishlist(false);
      setActionMessage(res.message || 'Game added to library!');
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="game-detail-loading">
        <div className="spinner"></div>
        <p>Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="game-detail-error">
        <h2>Game Not Found</h2>
        <p>{error || 'The requested game could not be found or has been removed.'}</p>
        <Link to="/browse" className="btn btn--primary">Back to Browse</Link>
      </div>
    );
  }

  const bannerSrc = game.bannerUrl || game.thumbnailUrl || `https://placehold.co/1200x400/1a1a2e/a78bfa?text=${encodeURIComponent(game.title)}`;
  const thumbnailSrc = game.thumbnailUrl || `https://placehold.co/400x225/1a1a2e/a78bfa?text=${encodeURIComponent(game.title)}`;

  return (
    <div className="game-detail-page">
      <div className="game-hero">
        <div className="game-hero__banner-wrap">
          <img src={bannerSrc} alt={game.title} className="game-hero__banner" />
          <div className="game-hero__overlay"></div>
        </div>
      </div>

      <div className="game-detail-container">
        <div className="game-main">
          <div className="game-header">
            <h1 className="game-title">{game.title}</h1>
            <div className="game-meta-pills">
              <span className="meta-pill meta-pill--genre">{game.primaryGenre}</span>
              <span className="meta-pill meta-pill--dev">by {game.developerUsername}</span>
              {game.releaseDate && (
                <span className="meta-pill meta-pill--date">
                  Released: {new Date(game.releaseDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="game-description">
            <h3>About This Game</h3>
            <p>{game.description}</p>
          </div>

          {game.tags && game.tags.length > 0 && (
            <div className="game-tags-section">
              <h3>Micro-Tags</h3>
              <div className="game-tags-list">
                {game.tags.map(t => (
                  <Link key={t} to={`/browse?tag=${encodeURIComponent(t)}`} className="game-tag">
                    #{t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* AI Review Summary Card (Rendered if >= 5 reviews and valid synthesis exists) */}
          {aiSummary && (
            <div className="ai-summary-card">
              <div className="ai-summary-card__header">
                <h3 className="ai-summary-card__title">✨ AI Review Synthesis</h3>
                <span className={`ai-summary-card__sentiment sentiment--${aiSummary.overall_sentiment}`}>
                  {aiSummary.overall_sentiment ? aiSummary.overall_sentiment.replace('_', ' ') : 'mixed'}
                </span>
              </div>

              <div className="ai-summary-grid">
                <div className="ai-summary-column ai-summary-column--pros">
                  <h4>Key Strengths (Pros)</h4>
                  {aiSummary.pros && aiSummary.pros.length > 0 ? (
                    <ul className="ai-summary-list">
                      {aiSummary.pros.map((pro, idx) => (
                        <li key={idx}><span>👍</span> {pro}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No clear pros reported.</p>
                  )}
                </div>

                <div className="ai-summary-column ai-summary-column--cons">
                  <h4>Common Concerns (Cons)</h4>
                  {aiSummary.cons && aiSummary.cons.length > 0 ? (
                    <ul className="ai-summary-list">
                      {aiSummary.cons.map((con, idx) => (
                        <li key={idx}><span>👎</span> {con}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No major concerns flagged.</p>
                  )}
                </div>
              </div>

              <div className="ai-summary-meta">
                Synthesized from {aiSummary.review_count_considered || 0} player reviews · Cached
              </div>
            </div>
          )}

          {/* Raw Review System */}
          <ReviewForm
            gameId={game.id}
            onReviewSubmitted={() => setReviewRefreshKey(k => k + 1)}
          />
          <ReviewList
            key={reviewRefreshKey}
            gameId={game.id}
          />
        </div>

        {/* Sidebar / Action Box */}
        <div className="game-sidebar">
          <div className="game-action-card">
            <div className="game-thumbnail-wrap">
              <img src={thumbnailSrc} alt={game.title} className="game-thumbnail" />
            </div>

            <div className="game-price-tag">
              {game.price === 0 ? 'Free to Play' : `₹${game.price.toFixed(2)}`}
            </div>

            {actionMessage && (
              <div className="action-message">{actionMessage}</div>
            )}

            <div className="game-action-buttons">
              {inLibrary ? (
                <div className="owned-badge">
                  <span>✓ Owned in Library</span>
                </div>
              ) : (
                <button
                  className="btn btn--primary btn--full"
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                >
                  {purchaseLoading ? 'Processing...' : game.price === 0 ? 'Add to Library (Free)' : `Buy Now — ₹${game.price.toFixed(2)}`}
                </button>
              )}

              {!inLibrary && (
                <button
                  className={`btn ${inWishlist ? 'btn--wishlisted' : 'btn--ghost'} btn--full`}
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? 'Updating...' : inWishlist ? '♥ In Wishlist (Remove)' : '♡ Add to Wishlist'}
                </button>
              )}
            </div>

            <div className="game-info-list">
              <div className="info-row">
                <span className="info-label">Developer</span>
                <span className="info-val">{game.developerUsername}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Genre</span>
                <span className="info-val">{game.primaryGenre}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-val status-badge">{game.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
