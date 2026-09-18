import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import GameCard from '../components/GameCard';
import './Browse.css';

const CATEGORIES = [
  { id: '', label: 'All Titles' },
  { id: 'RPG', label: 'RPG & Fantasy' },
  { id: 'Action', label: 'Action Roguelike' },
  { id: 'Simulation', label: 'Cozy & Simulation' },
  { id: 'Adventure', label: 'Adventure' },
  { id: 'Strategy', label: 'Strategy' },
  { id: 'Cyberpunk', label: 'Cyberpunk' },
  { id: 'Platformer', label: 'Pixel Platformer' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Releases' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'title_az', label: 'Alphabetical: A - Z' }
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [games, setGames] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filter params
  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (genre) params.set('genre', genre);
      if (sort) params.set('sort', sort);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('page', page.toString());
      params.set('limit', '12');

      const data = await api.get(`/games/search?${params.toString()}`);
      setGames(data.games || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to search games:', err);
    } finally {
      setLoading(false);
    }
  }, [q, genre, sort, minPrice, maxPrice, page]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = q || genre || minPrice || maxPrice || sort !== 'newest';

  // Find featured spotlight game from results or default
  const featuredGame = games.find(g => g.title?.includes('Dungeon') || g.id === 1) || games[0];

  return (
    <div className="browse-container">
      {/* =========================================================
          HERO SPOTLIGHT BANNER (from Stitch Design System)
          ========================================================= */}
      <section className="spotlight-banner">
        <div className="spotlight-media-wrap">
          <img
            src="/images/dungeon-baker.png"
            alt="Dungeon Baker: Pastry Quest featured gameplay screenshot"
            className="spotlight-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="spotlight-hud-overlay">
            <div className="hud-chip">
              <span className="hud-icon">🎮</span> Direct In-Engine Gameplay
            </div>
            <div className="hud-chip hud-chip-accent">
              <span className="hud-icon">✨</span> Vault Spotlight
            </div>
          </div>
        </div>

        <div className="spotlight-content">
          <div className="spotlight-badge-row">
            <span className="ai-indicator-chip">
              <span>✨</span> AI-Triage Verified
            </span>
            <span className="badge-tag">Steam Deck 60 FPS</span>
            <span className="badge-tag">DRM-Free</span>
          </div>

          <h1 className="spotlight-title">
            {featuredGame ? featuredGame.title : 'Dungeon Baker: Pastry Quest'}
          </h1>

          <div className="spotlight-sub">
            <span>By <strong style={{ color: 'var(--text-main)' }}>Croissant Coven</strong></span>
            <span>•</span>
            <span className="spotlight-rating">★ 4.9 / 5.0</span>
            <span style={{ color: 'var(--accent)' }}>Overwhelmingly Positive (28 reviews)</span>
          </div>

          <p className="spotlight-desc">
            Step into the Flourishing Hearth! Bake enchanted sourdough, cast kinetic fermentation runes, and feed hungry dungeon-crawling adventurers in this high-vibe tavern simulation RPG.
          </p>

          <div className="spotlight-tags">
            <span className="badge badge-tag">Pixel Art</span>
            <span className="badge badge-tag">Cozy Management</span>
            <span className="badge badge-tag">Crafting RPG</span>
            <span className="badge badge-tag">Singleplayer</span>
          </div>

          <div className="spotlight-actions">
            <Link
              to={featuredGame ? `/games/${featuredGame.id}` : '/games/1'}
              className="btn btn-primary btn-lg"
            >
              <span>Inspect Game — $9.99</span>
            </Link>
            <Link
              to={featuredGame ? `/games/${featuredGame.id}` : '/games/1'}
              className="btn btn-secondary btn-lg"
            >
              <span>View Reviews &amp; AI Synthesis</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          STOREFRONT CONTROLS & CATEGORY FILTER RAIL
          ========================================================= */}
      <div className="catalog-header">
        <div className="catalog-title-wrap">
          <h2 className="catalog-title">Storefront Catalog</h2>
          <p className="catalog-subtitle">
            Curated indie binaries with AI-automated triage verification and DRM-free builds.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="category-pill-rail">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-pill ${genre === cat.id ? 'active' : ''}`}
              onClick={() => updateParam('genre', cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Bar */}
        <div className="catalog-toolbar">
          <div className="search-box">
            <span className="search-icon-symbol">🔍</span>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search by title, mechanics, or tags..."
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
            />
            {q && (
              <button className="clear-btn" onClick={() => updateParam('q', '')}>✕</button>
            )}
          </div>

          <div className="toolbar-actions">
            <div className="price-filter-cluster">
              <span className="filter-label">Max $:</span>
              <input
                type="number"
                placeholder="20"
                className="price-number-input"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
              />
            </div>

            <select
              className="sort-dropdown"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          GAMES GRID & PAGINATION
          ========================================================= */}
      {loading ? (
        <div className="games-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '320px' }}></div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="catalog-empty-state">
          <div className="empty-icon">🎮</div>
          <h3>No matching games found</h3>
          <p>Try adjusting your search query, clearing genre filters, or relaxing price constraints.</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px' }} onClick={clearFilters}>
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="games-grid">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="catalog-pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => updateParam('page', (page - 1).toString())}
              >
                ← Previous
              </button>
              <span className="pagination-text">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} titles)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => updateParam('page', (page + 1).toString())}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
