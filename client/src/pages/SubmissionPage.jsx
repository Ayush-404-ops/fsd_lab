import { useEffect, useState } from 'react';
import { api } from '../api';
import TagSelector from '../components/TagSelector';
import './SubmissionPage.css';

// This mirrors the server-side catalogue so the form remains useful while the
// API is unavailable. AI-powered recommendations intentionally do not appear
// here; developers choose from the same constrained, descriptive tag set.
const FALLBACK_TAG_CATEGORIES = {
  'Gameplay Style': [
    'cozy farming sim', 'roguelike deckbuilder', 'narrative horror',
    'bullet hell', 'metroidvania', 'souls-like', 'tower defense',
    'idle clicker', 'city builder', 'survival crafting',
    'turn-based tactics', 'real-time strategy', 'visual novel',
    'point-and-click adventure', 'rhythm game', 'sandbox exploration'
  ],
  'Mood & Aesthetic': [
    'pixel art', 'hand-drawn art', 'lo-fi aesthetic', 'neon cyberpunk',
    'dark fantasy', 'wholesome', 'atmospheric horror', 'retro 8-bit',
    'minimalist', 'pastel dreamscape', 'steampunk'
  ],
  'Mechanics & Features': [
    'procedural generation', 'base building', 'crafting system',
    'dialogue choices', 'permadeath', 'time loop', 'deck building',
    'physics-based puzzles', 'character customization', 'co-op multiplayer',
    'local couch co-op', 'modding support', 'level editor'
  ],
  'Theme & Setting': [
    'post-apocalyptic', 'space exploration', 'underwater adventure',
    'medieval fantasy', 'modern day', 'mythological', 'sci-fi dystopia',
    'slice of life', 'detective mystery', 'cosmic horror',
    'animal protagonists'
  ],
  'Session Length & Accessibility': [
    'short sessions (< 30 min)', 'long campaign (20+ hours)',
    'pick up and play', 'controller support', 'accessibility options',
    'colorblind friendly', 'keyboard only'
  ]
};

const GENRES = [
  'Action', 'Adventure', 'Casual', 'Puzzle', 'Racing', 'RPG', 'Simulation',
  'Sports', 'Strategy', 'Visual Novel', 'Other'
];

const BUILD_ACCEPT = '.zip,.rar,.7z,.gz,.tgz,.exe,.bin,.apk,.dmg';
const MAX_BUILD_BYTES = 50 * 1024 * 1024;
const MAX_TAGS = 8;

const INITIAL_FORM = {
  title: '',
  description: '',
  price: '0',
  primaryGenre: '',
  thumbnailUrl: '',
  bannerUrl: '',
  versionNumber: '1.0.0',
  changelog: ''
};

function isTagCatalogue(value) {
  return value
    && typeof value === 'object'
    && Object.values(value).some((tags) => Array.isArray(tags) && tags.length > 0);
}

export default function SubmissionPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [tagCategories, setTagCategories] = useState(FALLBACK_TAG_CATEGORIES);
  const [selectedTags, setSelectedTags] = useState([]);
  const [buildFile, setBuildFile] = useState(null);
  const [catalogueState, setCatalogueState] = useState('loading');
  const [createdGame, setCreatedGame] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/tags')
      .then((data) => {
        if (!active) return;
        if (isTagCatalogue(data.categories)) {
          setTagCategories(data.categories);
          setCatalogueState('ready');
        } else {
          setCatalogueState('fallback');
        }
      })
      .catch(() => {
        if (active) setCatalogueState('fallback');
      });

    return () => { active = false; };
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleTag = (tag) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= MAX_TAGS) {
        setError(`Choose up to ${MAX_TAGS} micro-tags so your listing stays focused.`);
        return current;
      }
      setError('');
      return [...current, tag];
    });
  };

  const handleBuildFile = (event) => {
    const file = event.target.files?.[0] || null;
    setBuildFile(file);
    if (file && file.size > MAX_BUILD_BYTES) {
      setError('Build files must be 50 MB or smaller.');
    } else {
      setError('');
    }
  };

  const validate = () => {
    if (!form.title.trim()) return 'Enter a game title.';
    if (!form.description.trim()) return 'Add a short game description.';
    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      return 'Price must be zero or a positive number.';
    }
    if (!buildFile) return 'Choose the build file you want reviewed.';
    if (buildFile.size > MAX_BUILD_BYTES) return 'Build files must be 50 MB or smaller.';
    if (!form.versionNumber.trim()) return 'Enter a version number.';
    if (!form.changelog.trim()) return 'Add a changelog for the reviewer.';
    return '';
  };

  const createGame = async () => {
    const data = await api.post('/games', {
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      primary_genre: form.primaryGenre || null,
      tags: selectedTags,
      thumbnail_url: form.thumbnailUrl.trim() || null,
      banner_url: form.bannerUrl.trim() || null
    });

    setCreatedGame(data.game);
    return data.game;
  };

  const submitBuild = async (game) => {
    const payload = new FormData();
    payload.append('game_id', String(game.id));
    payload.append('version_number', form.versionNumber.trim());
    payload.append('changelog', form.changelog.trim());
    payload.append('buildFile', buildFile);

    const data = await api.post('/submissions', payload);
    setSubmission(data.submission);
    setNotice(`“${game.title}” is now pending review.`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // Keep the created game in state if the upload fails. A retry therefore
      // sends only the build instead of creating duplicate game drafts.
      const game = createdGame || await createGame();
      await submitBuild(game);
    } catch (requestError) {
      const prefix = createdGame
        ? 'Your game listing was created, but the build could not be submitted. '
        : '';
      setError(`${prefix}${requestError.message || 'Something went wrong. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const startAnotherSubmission = () => {
    setForm(INITIAL_FORM);
    setSelectedTags([]);
    setBuildFile(null);
    setCreatedGame(null);
    setSubmission(null);
    setError('');
    setNotice('');
  };

  if (submission) {
    return (
      <main className="submission-page">
        <section className="submission-result" aria-live="polite">
          <span className="submission-result__icon" aria-hidden="true">✓</span>
          <p className="submission-eyebrow">Submitted for review</p>
          <h1>Your build is in the queue.</h1>
          <p>{notice || 'Your game and its build were submitted successfully.'}</p>
          <dl className="submission-result__details">
            <div><dt>Game</dt><dd>{createdGame?.title}</dd></div>
            <div><dt>Version</dt><dd>{submission.versionNumber || form.versionNumber}</dd></div>
            <div><dt>Status</dt><dd className="submission-status">{submission.status || 'pending'}</dd></div>
          </dl>
          <button type="button" className="submission-button submission-button--primary" onClick={startAnotherSubmission}>
            Submit another game
          </button>
        </section>
      </main>
    );
  }

  const isRetry = Boolean(createdGame);

  return (
    <main className="submission-page">
      <section className="submission-hero">
        <p className="submission-eyebrow">Developer portal</p>
        <h1>Submit your game</h1>
        <p>Share a clear listing, choose precise discovery tags, and upload the build for review.</p>
      </section>

      <form className="submission-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="submission-message submission-message--error" role="alert">{error}</div>}
        {isRetry && (
          <div className="submission-message submission-message--warning" role="status">
            The game listing for <strong>{createdGame.title}</strong> already exists. Retrying will upload this build only.
          </div>
        )}

        <fieldset className="submission-section" disabled={submitting || isRetry}>
          <legend>Store listing</legend>
          <div className="submission-grid">
            <label className="submission-field submission-field--wide">
              <span>Game title <em>*</em></span>
              <input name="title" value={form.title} onChange={updateField} maxLength="150" placeholder="e.g. Lanterns of the Tidelands" />
            </label>

            <label className="submission-field submission-field--wide">
              <span>Short description <em>*</em></span>
              <textarea name="description" value={form.description} onChange={updateField} rows="5" placeholder="Tell players what makes your game worth discovering." />
            </label>

            <label className="submission-field">
              <span>Primary genre</span>
              <select name="primaryGenre" value={form.primaryGenre} onChange={updateField}>
                <option value="">Choose a genre</option>
                {GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
              </select>
            </label>

            <label className="submission-field">
              <span>Price (₹)</span>
              <input name="price" type="number" value={form.price} onChange={updateField} min="0" step="0.01" inputMode="decimal" />
            </label>

            <label className="submission-field">
              <span>Thumbnail URL</span>
              <input name="thumbnailUrl" type="url" value={form.thumbnailUrl} onChange={updateField} placeholder="https://…" />
            </label>

            <label className="submission-field">
              <span>Banner URL</span>
              <input name="bannerUrl" type="url" value={form.bannerUrl} onChange={updateField} placeholder="https://…" />
            </label>
          </div>
        </fieldset>

        <fieldset className="submission-section" disabled={submitting || isRetry}>
          <legend>Discovery micro-tags</legend>
          <p className="submission-help">
            Choose up to {MAX_TAGS} tags that genuinely describe the experience. Use the AI suggestion button below for smart recommendations based on your title and description.
          </p>
          <TagSelector
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            title={form.title}
            description={form.description}
            category={form.primaryGenre}
          />
        </fieldset>

        <fieldset className="submission-section" disabled={submitting}>
          <legend>Build for review</legend>
          <div className="submission-grid">
            <label className="submission-field">
              <span>Version number <em>*</em></span>
              <input name="versionNumber" value={form.versionNumber} onChange={updateField} maxLength="20" placeholder="1.0.0" />
            </label>

            <label className="submission-field submission-field--file">
              <span>Build file <em>*</em></span>
              <input type="file" accept={BUILD_ACCEPT} onChange={handleBuildFile} />
              <small>{buildFile ? `${buildFile.name} · ${(buildFile.size / 1024 / 1024).toFixed(1)} MB` : 'ZIP, RAR, 7Z, GZ, TGZ, EXE, BIN, APK, or DMG — up to 50 MB'}</small>
            </label>

            <label className="submission-field submission-field--wide">
              <span>Changelog for the reviewer <em>*</em></span>
              <textarea name="changelog" value={form.changelog} onChange={updateField} rows="4" placeholder="What is included in this build? Mention controls, test notes, and notable changes." />
            </label>
          </div>
        </fieldset>

        <div className="submission-actions">
          <p>Your game becomes visible to players only after review and approval.</p>
          <button type="submit" className="submission-button submission-button--primary" disabled={submitting}>
            {submitting ? (isRetry ? 'Uploading build…' : 'Creating listing…') : (isRetry ? 'Retry build submission' : 'Submit for review')}
          </button>
        </div>
      </form>
    </main>
  );
}
