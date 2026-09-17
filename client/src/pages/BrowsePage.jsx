import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import GameCard from '../components/GameCard';
import './pages.css';

const GENRES = [
  'Action', 'Adventure', 'Casual', 'Puzzle', 'Racing', 'RPG',
  'Simulation', 'Sports', 'Strategy', 'Visual Novel', 'Other'
];

const FALLBACK_TAGS = [
  'cozy farming sim', 'roguelike deckbuilder', 'narrative horror',
  'metroidvania', 'souls-like', 'city builder', 'survival crafting',
  'pixel art', 'dark fantasy', 'wholesome', 'co-op multiplayer',
  'space exploration', 'detective mystery'
];

function BrowsePage({ featured = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState([]);
  const [tags, setTags] = useState(FALLBACK_TAGS);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = useMemo(() => ({
    q: searchParams.get('q') || '',
    genre: searchParams.get('genre') || '',
    tag: searchParams.get('tag') || '',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page') || 1)
  }), [searchParams]);

  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  useEffect(() => {
    let active = true;
    api.get('/tags')
      .then((data) => {
        if (!active || !Array.isArray(data.allTags) || data.allTags.length === 0) return;
        setTags(data.allTags);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      page: String(filters.page),
      limit: '12',
      sort: filters.sort
    });
    if (filters.q) params.set('q', filters.q);
    if (filters.genre) params.set('genre', filters.genre);
    if (filters.tag) params.set('tag', filters.tag);

    api.get(`/games/search?${params.toString()}`)
      .then((data) => {
        if (!active) return;
        setGames(data.games || []);
        setPagination(data.pagination || { page: filters.page, totalPages: 1, total: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load the catalog.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [filters]);

  const updateFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateFilter('q', query.trim());
  };

  const clearFilters = () => {
    setQuery('');
    setSearchParams({});
  };

  const goToPage = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-container browse-page">
      <section className="browse-hero">
        <div>
          <p className="eyebrow">The indie game shelf</p>
          <h1>{featured ? 'Find your next favorite game.' : 'Browse the vault.'}</h1>
          <p className="page-lede">
            Explore independent games by genre, mood, mechanics, and the people who made them.
          </p>
        </div>
        <div className="browse-hero__mark" aria-hidden="true">✦</div>
      </section>

      <form className="catalog-search" onSubmit={handleSearch}>
        <label className="search-field">
          <span className="sr-only">Search games</span>
          <span className="search-field__icon" aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or description..."
          />
        </label>
        <button className="btn btn--primary" type="submit">Search</button>
      </form>

      <section className="catalog-toolbar" aria-label="Catalog filters">
        <select value={filters.genre} onChange={(event) => updateFilter('genre', event.target.value)}>
          <option value="">All genres</option>
          {GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
        </select>
        <select value={filters.tag} onChange={(event) => updateFilter('tag', event.target.value)}>
          <option value="">All micro-tags</option>
          {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title_az">Title A–Z</option>
          <option value="title_za">Title Z–A</option>
          <option value="price_low">Price: low to high</option>
          <option value="price_high">Price: high to low</option>
        </select>
        {(filters.q || filters.genre || filters.tag || filters.sort !== 'newest') && (
          <button className="text-button" type="button" onClick={clearFilters}>Clear filters</button>
        )}
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Curated catalog</p>
          <h2>{filters.q ? `Results for “${filters.q}”` : 'All published games'}</h2>
        </div>
        {!loading && <span className="result-count">{pagination.total || 0} games</span>}
      </div>

      {error && <div className="notice notice--error" role="alert">{error}</div>}
      {loading && <div className="loading-state">Opening the catalog<span className="loading-dots">...</span></div>}
      {!loading && !error && games.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">◌</div>
          <h2>No games match those filters.</h2>
          <p>Try a broader search or clear the filters to see the full shelf.</p>
          <button className="btn btn--ghost" type="button" onClick={clearFilters}>Show all games</button>
        </div>
      )}
      {!loading && !error && games.length > 0 && (
        <>
          <div className="game-grid">
            {games.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
          {pagination.totalPages > 1 && (
            <nav className="pagination" aria-label="Catalog pages">
              <button
                className="pagination__button"
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                ← Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                className="pagination__button"
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default BrowsePage;