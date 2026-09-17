import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import './Reviews.css';

export function ReviewList({ gameId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const data = await api.get(`/reviews/${gameId}`);
      setReviews(data.reviews);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [gameId]);

  if (loading) return <div className="reviews-loading">Loading reviews...</div>;

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h2 className="reviews-title">Player Reviews</h2>
        {stats && stats.totalReviews > 0 && (
          <div className="reviews-stats">
            <div className="reviews-stat">
              <span className="stat-value">{stats.averageRating}</span>
              <span className="stat-label">/ 5 avg</span>
            </div>
            <div className="reviews-stat">
              <span className="stat-value">{stats.totalReviews}</span>
              <span className="stat-label">reviews</span>
            </div>
            <div className="reviews-stat">
              <span className="stat-value">{stats.recommendedPercent}%</span>
              <span className="stat-label">recommend</span>
            </div>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="reviews-empty">No reviews yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-card__header">
                <div className="review-card__user">
                  <div className="review-card__avatar">
                    {review.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="review-card__username">{review.username}</span>
                    <span className="review-card__date">
                      {new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="review-card__rating-wrap">
                  <div className="review-card__stars">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} className={`star ${i <= review.rating ? 'star--filled' : ''}`}>★</span>
                    ))}
                  </div>
                  <span className={`review-card__recommend ${review.isRecommended ? 'recommend--yes' : 'recommend--no'}`}>
                    {review.isRecommended ? '👍 Recommended' : '👎 Not Recommended'}
                  </span>
                </div>
              </div>
              <h4 className="review-card__title">{review.title}</h4>
              <p className="review-card__content">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewForm({ gameId, onReviewSubmitted }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isRecommended, setIsRecommended] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) {
    return (
      <div className="review-form-cta">
        <p>Log in to write a review</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (rating === 0) { setError('Please select a rating.'); return; }
    if (!title.trim()) { setError('Please enter a review title.'); return; }
    if (!content.trim()) { setError('Please write your review.'); return; }

    setSubmitting(true);
    try {
      await api.post(`/reviews/${gameId}`, { rating, title: title.trim(), content: content.trim(), isRecommended });
      setSuccess('Review submitted!');
      setRating(0);
      setTitle('');
      setContent('');
      setIsRecommended(true);
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3 className="review-form__heading">Write a Review</h3>

      {error && <div className="review-form__error">{error}</div>}
      {success && <div className="review-form__success">{success}</div>}

      <div className="review-form__stars">
        <label className="review-form__label">Your Rating</label>
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              className={`star-btn ${i <= (hoverRating || rating) ? 'star-btn--active' : ''}`}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
            >
              ★
            </button>
          ))}
          {rating > 0 && <span className="star-label">{rating}/5</span>}
        </div>
      </div>

      <div className="review-form__field">
        <label className="review-form__label" htmlFor="review-title">Title</label>
        <input
          id="review-title"
          type="text"
          className="input"
          placeholder="Summarise your experience..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="review-form__field">
        <label className="review-form__label" htmlFor="review-content">Review</label>
        <textarea
          id="review-content"
          className="input textarea"
          placeholder="What did you like or dislike?"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
        />
      </div>

      <div className="review-form__recommend">
        <label className="review-form__label">Do you recommend this game?</label>
        <div className="recommend-toggle">
          <button
            type="button"
            className={`recommend-btn ${isRecommended ? 'recommend-btn--active recommend-btn--yes' : ''}`}
            onClick={() => setIsRecommended(true)}
          >
            👍 Yes
          </button>
          <button
            type="button"
            className={`recommend-btn ${!isRecommended ? 'recommend-btn--active recommend-btn--no' : ''}`}
            onClick={() => setIsRecommended(false)}
          >
            👎 No
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
