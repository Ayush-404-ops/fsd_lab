import { Link } from 'react-router-dom';
import './GameCard.css';

export default function GameCard({ game }) {
  const thumbnailSrc = game.thumbnailUrl || `https://placehold.co/400x225/1a1a2e/a78bfa?text=${encodeURIComponent(game.title)}`;

  return (
    <Link to={`/games/${game.id}`} className="game-card">
      <div className="game-card__image-wrap">
        <img
          src={thumbnailSrc}
          alt={game.title}
          className="game-card__image"
          loading="lazy"
        />
        <div className="game-card__overlay">
          <span className="game-card__view">View Details →</span>
        </div>
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title">{game.title}</h3>
          <p className="game-card__developer">by {game.developerUsername || 'Independent developer'}</p>
        <div className="game-card__footer">
          <span className="game-card__price">
            {Number(game.price) === 0 ? 'Free' : `₹${Number(game.price).toFixed(2)}`}
          </span>
          {game.primaryGenre && (
            <span className="game-card__genre">{game.primaryGenre}</span>
          )}
        </div>
        {game.tags && game.tags.length > 0 && (
          <div className="game-card__tags">
            {game.tags.slice(0, 3).map(tag => (
              <span key={tag} className="game-card__tag">{tag}</span>
            ))}
            {game.tags.length > 3 && (
              <span className="game-card__tag game-card__tag--more">+{game.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
