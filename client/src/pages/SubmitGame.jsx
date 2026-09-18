import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TagSelector from '../components/TagSelector';
import './SubmitGame.css';

const GENRES = [
  'Action Roguelike', 'Cyberpunk', 'Cozy Simulation', 'RPG & Fantasy',
  'Platformer', 'Strategy', 'Adventure', 'Puzzle', 'Sci-Fi'
];

export default function SubmitGame() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('14.99');
  const [primaryGenre, setPrimaryGenre] = useState('Action Roguelike');
  const [tags, setTags] = useState(['Cyberpunk', 'Roguelike', 'Fast-Paced']);
  const [version, setVersion] = useState('v1.0.0');
  const [changelog, setChangelog] = useState('- Initial release build\n- Full Steam Deck controller mapping\n- DRM-Free standalone binary packaging');
  const [buildFileName, setBuildFileName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Quick Demo Pre-fill for testing/review
  const handleLoadSample = () => {
    setTitle('Neon Abyss: Zero Cycle');
    setPrimaryGenre('Action Roguelike');
    setPrice('14.99');
    setDescription(
      'A fast-paced cyberpunk twin-stick roguelike set in a procedurally generated neo-Tokyo megastructure. Hack cybernetics, customize modular weapon synergies, and face relentless rogue synth sentinels.'
    );
    setVersion('v0.9.4-beta');
    setChangelog(
      '- Added 14 new modular cyber-implant combinations\n- Implemented dynamic boss health scaling for sector 3\n- Controller re-binding and Steam Deck optimization'
    );
    setTags(['Cyberpunk', 'Roguelike', 'Twin-Stick Shooter', 'Fast-Paced']);
    setBuildFileName('neon_abyss_v0.9.4_build.zip (482 MB)');
    setFeedback({
      message: '✨ Loaded pre-configured submission sample: Neon Abyss: Zero Cycle',
      type: 'info'
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBuildFileName(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ message: '', type: '' });

    if (!title.trim()) {
      setFeedback({ message: 'Game Title is required.', type: 'error' });
      return;
    }
    if (!description.trim()) {
      setFeedback({ message: 'Game Description is required.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        primaryGenre,
        tags,
        version: version.trim() || 'v1.0.0',
        changelog: changelog.trim(),
        buildFileName: buildFileName || 'game_build_v1.zip'
      };

      const res = await api.post('/submissions', payload);
      setFeedback({
        message: `✓ Game "${title}" successfully submitted to Admin Review Queue (ID: ${res.submissionId || 101}).`,
        type: 'success'
      });

      setTimeout(() => {
        navigate('/admin/queue');
      }, 2000);
    } catch (err) {
      setFeedback({
        message: err.message || 'Submission failed. Please check fields.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submit-page-container">
      {/* Header */}
      <div className="submit-header-wrap">
        <div className="submit-breadcrumb">
          <span className="dev-portal-badge">Developer Portal</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-text">Publishing Pipeline</span>
        </div>
        <div className="submit-title-row">
          <h1 className="submit-page-title">Submit Game for Review</h1>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLoadSample}
            title="Pre-fill sample game data"
          >
            ⚡ Load Demo Sample
          </button>
        </div>
        <p className="submit-page-desc">
          Publish your build to the IndieVault store. Submissions undergo automated QA triage and admin verification before going live.
        </p>
      </div>

      {feedback.message && (
        <div className={`feedback-alert ${feedback.type}`}>
          <span>{feedback.type === 'success' ? '✓' : feedback.type === 'error' ? '⚠️' : '✨'}</span>
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Main Publishing Form */}
      <form className="form-card" onSubmit={handleSubmit}>
        {/* Game Title */}
        <div className="form-group">
          <label className="form-label">
            <span>Game Title *</span>
            <span className="sub">Public store release title</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Neon Abyss: Zero Cycle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Two-Column: Genre and Price */}
        <div className="form-row-2col">
          <div className="form-group">
            <label className="form-label">
              <span>Primary Genre / Category *</span>
            </label>
            <select
              className="form-select"
              value={primaryGenre}
              onChange={(e) => setPrimaryGenre(e.target.value)}
            >
              {GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Price ($ USD) *</span>
              <span className="sub">0 for Free-to-Play</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">
            <span>Detailed Game Description *</span>
            <span className="sub">Used by players and AI to analyze mechanics &amp; tags</span>
          </label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Describe gameplay loops, narrative premise, mechanics, and visual atmosphere..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* SMART AI TAG SUGGESTIONS COMPONENT */}
        <div className="form-group">
          <label className="form-label">
            <span>Game Discovery Micro-Tags *</span>
            <span className="sub">Tags power store categorization and search filters</span>
          </label>
          
          <TagSelector
            selectedTags={tags}
            onChange={setTags}
            title={title}
            description={description}
            category={primaryGenre}
          />
        </div>

        {/* Build & Version Information */}
        <div className="form-row-2col">
          <div className="form-group">
            <label className="form-label">
              <span>Version String</span>
              <span className="sub">Semantic versioning</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="v1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Standalone Binary Payload (.zip, .tar.gz)</span>
              <span className="sub">DRM-Free executable package</span>
            </label>
            <label className="file-dropzone-label">
              <input
                type="file"
                className="hidden-file-input"
                onChange={handleFileUpload}
                accept=".zip,.tar.gz,.exe,.bin"
              />
              <span className="dropzone-text">
                {buildFileName ? `📁 ${buildFileName}` : '📂 Click or drag zip archive here (Max 2 GB)'}
              </span>
            </label>
          </div>
        </div>

        {/* Changelog Notes */}
        <div className="form-group">
          <label className="form-label">
            <span>Changelog &amp; Release Notes</span>
            <span className="sub">Visible to reviewers and players</span>
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="- Bug fixes and optimization&#10;- New mechanics added"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
          />
        </div>

        {/* Submit Actions */}
        <div className="form-actions-row">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting}
          >
            <span>{submitting ? 'Dispatching Payload...' : 'Submit Game to Admin Review Queue →'}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-lg"
            onClick={() => navigate('/browse')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
