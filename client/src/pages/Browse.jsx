import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import GameCard from '../components/GameCard';
import './Browse.css';

const GENRES = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Indie',
  'Platformer', 'Puzzle', 'Sci-Fi', 'Horror', 'Casual', 'Simulation'
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Releases' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'title_az', label: 'Title: A - Z' },
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [games, setGames] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state synced with URL params
  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const tag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Load available tags for filter dropdown
  useEffect(() => {
    api.get('/tags')
      .then(data => setTags(data.allTags || []))
      .catch(err => console.error('Failed to load tags:', err));
  }, []);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // reset page on filter change
    setSearchParams(newParams);
  };

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (genre) params.set('genre', genre);
      if (tag) params.set('tag', tag);
      if (sort) params.set('sort', sort);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('page', page.toString());
      params.set('limit', '12');

      const data = await api.get(`/games/search?${params.toString()}`);
      setGames(data.games);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to search games:', err);
    } finally {
      setLoading(false);
    }
  }, [q, genre, tag, sort, minPrice, maxPrice, page]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = q || genre || tag || minPrice || maxPrice;

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1 className="browse-title">Browse Indie Catalog</h1>
        <p className="browse-subtitle">Discover handcrafted indie titles from talented creators around the globe.</p>
      </div>

      <div className="browse-controls">
        <div className="search-bar-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="input search-input"
            placeholder="Search by title or description..."
            value={q}
            onChange={e => updateParam('q', e.target.value)}
          />
          {q && (
            <button className="search-clear" onClick={() => updateParam('q', '')}>×</button>
          )}
        </div>

        <div className="filter-bar">
          <select
            className="input select-input"
            value={genre}
            onChange={e => updateParam('genre', e.target.value)}
          >
            <option value="">All Genres</option>
            {GENRES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            className="input select-input"
            value={tag}
            onChange={e => updateParam('tag', e.target.value)}
          >
            <option value="">All Micro-Tags</option>
            {tags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="input select-input"
            value={sort}
            onChange={e => updateParam('sort', e.target.value)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="price-inputs">
            <input
              type="number"
              className="input price-input"
              placeholder="Min ₹"
              value={minPrice}
              onChange={e => updateParam('minPrice', e.target.value)}
              min="0"
            />
            <span className="price-dash">-</span>
            <input
              type="number"
              className="input price-input"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={e => updateParam('maxPrice', e.target.value)}
              min="0"
            />
          </div>

          {hasActiveFilters && (
            <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="browse-loading">
          <div className="spinner"></div>
          <p>Scanning the vault...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="browse-empty">
          <h3>No games found</h3>
          <p>Try adjusting your search query or filters to find what you're looking for.</p>
          {hasActiveFilters && (
            <button className="btn btn--primary" onClick={clearFilters}>
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="browse-results-count">
            Showing {games.length} of {pagination.total} published games
          </div>

          <div className="games-grid">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn--ghost btn--sm"
                disabled={page <= 1}
                onClick={() => updateParam('page', (page - 1).toString())}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn--ghost btn--sm"
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
