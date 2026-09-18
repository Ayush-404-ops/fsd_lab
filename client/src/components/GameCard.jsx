import { Link } from 'react-router-dom';
import './GameCard.css';

export default function GameCard({ game, onWishlistToggle, isWishlisted }) {
  // If game has an image or we have fallback
  const thumbnailSrc = game.thumbnailUrl || game.coverUrl || (game.id === 1 || game.title?.includes('Dungeon') ? '/images/dungeon-baker.png' : `https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80`);

  const formattedPrice = Number(game.price) === 0 ? 'Free to Play' : `$${Number(game.price).toFixed(2)}`;
  const hasDiscount = Number(game.price) > 0 && Number(game.price) < 15;

  return (
    <div className="game-card">
      <Link to={`/games/${game.id}`} className="game-card-link">
        {/* Media Frame */}
        <div className="game-card-thumb-wrap">
          <img
            src={thumbnailSrc}
            alt={game.title}
            className="game-card-thumb"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
            }}
          />
          
          {/* Top Badges */}
          <div className="thumb-badges-top">
            <span className="badge-ai-pill">
              <span className="sparkle-icon">✨</span> AI-Triage Verified
            </span>
            {hasDiscount && (
              <span className="badge-discount">-23%</span>
            )}
          </div>

          {/* Quick Platform indicator overlay */}
          <div className="thumb-platforms-overlay">
            <span title="Windows">Win</span>
            <span>•</span>
            <span title="Steam Deck 60 FPS">Deck</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="game-card-content">
          <div className="game-card-header">
            <h3 className="game-card-title">{game.title}</h3>
            <span className="game-card-developer">
              by <span className="dev-name">{game.developerUsername || 'Independent'}</span>
            </span>
          </div>

          {/* Rating bar */}
          <div className="game-card-rating-row">
            <span className="star-rating">★ 4.9</span>
            <span className="rating-count">({game.reviewCount || 28})</span>
            <span className="rating-sentiment">Overwhelmingly Positive</span>
          </div>

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <div className="game-card-tags">
              {game.tags.slice(0, 3).map(tag => (
                <span key={tag} className="game-card-tag">{tag}</span>
              ))}
              {game.tags.length > 3 && (
                <span className="game-card-tag tag-more">+{game.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer Shelf */}
          <div className="game-card-footer">
            <div className="price-cluster">
              <span className="game-price">{formattedPrice}</span>
              {hasDiscount && <span className="original-price">${(Number(game.price) * 1.3).toFixed(2)}</span>}
            </div>
            <span className="view-btn">Inspect →</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
