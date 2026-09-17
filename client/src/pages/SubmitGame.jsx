import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TagSelector from '../components/TagSelector';
import './SubmitGame.css';

const GENRES = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Indie',
  'Platformer', 'Puzzle', 'Sci-Fi', 'Horror', 'Casual', 'Simulation'
];

export default function SubmitGame() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [primaryGenre, setPrimaryGenre] = useState('Action');
  const [tags, setTags] = useState([]);
  const [buildFileUrl, setBuildFileUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user || (user.role !== 'developer' && user.role !== 'admin')) {
    return (
      <div className="submit-game-access-denied">
        <h2>Developer Access Required</h2>
        <p>You must be registered as a Developer or Admin to submit games.</p>
        <button className="btn btn--primary" onClick={() => navigate('/browse')}>
          Browse Games
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) { setError('Title is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }
    if (isNaN(Number(price)) || Number(price) < 0) { setError('Please enter a valid price.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        primaryGenre,
        tags,
        buildFileUrl: buildFileUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined
      };

      const res = await api.post('/submissions', payload);
      setSuccess(`Submission created successfully (ID: ${res.submissionId}). Pending admin review.`);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPrice('0');
      setPrimaryGenre('Action');
      setTags([]);
      setBuildFileUrl('');
      setThumbnailUrl('');
      setBannerUrl('');

      setTimeout(() => {
        navigate('/browse');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submit-game-page">
      <div className="submit-game-header">
        <h1 className="submit-game-title">Submit Your Indie Game</h1>
        <p className="submit-game-subtitle">
          Submit your game for admin verification and automated AI safety triage.
        </p>
      </div>

      <form className="submit-game-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="form-group">
          <label className="label" htmlFor="game-title">Game Title *</label>
          <input
            id="game-title"
            type="text"
            className="input"
            placeholder="e.g. Neon Cyber Odyssey"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label" htmlFor="game-genre">Primary Genre *</label>
            <select
              id="game-genre"
              className="input"
              value={primaryGenre}
              onChange={e => setPrimaryGenre(e.target.value)}
            >
              {GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="game-price">Price (₹) *</label>
            <input
              id="game-price"
              type="number"
              className="input"
              placeholder="0 for free"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label" htmlFor="game-desc">Description *</label>
          <textarea
            id="game-desc"
            className="input textarea"
            placeholder="Describe your game, gameplay mechanics, storyline..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            required
          />
        </div>

        {/* Micro-Tag Selection UI */}
        <div className="form-group">
          <label className="label">Categorized Micro-Tags</label>
          <p className="form-help">Select tags that describe your game's mechanics, atmosphere, and pacing.</p>
          <TagSelector
            selectedTags={tags}
            onChange={newTags => setTags(newTags)}
            title={title}
            description={description}
            category={primaryGenre}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="build-url">Build File / Executable Download URL</label>
          <input
            id="build-url"
            type="url"
            className="input"
            placeholder="https://example.com/builds/game-v1.zip"
            value={buildFileUrl}
            onChange={e => setBuildFileUrl(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label" htmlFor="thumb-url">Thumbnail Image URL</label>
            <input
              id="thumb-url"
              type="url"
              className="input"
              placeholder="https://example.com/thumb.jpg"
              value={thumbnailUrl}
              onChange={e => setThumbnailUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="banner-url">Hero Banner Image URL</label>
            <input
              id="banner-url"
              type="url"
              className="input"
              placeholder="https://example.com/banner.jpg"
              value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Game for Review'}
        </button>
      </form>
    </div>
  );
}
