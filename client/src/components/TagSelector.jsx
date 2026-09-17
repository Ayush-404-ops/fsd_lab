import { useState, useEffect } from 'react';
import { api } from '../api';
import './TagSelector.css';

export default function TagSelector({
  selectedTags = [],
  onChange,
  title = '',
  description = '',
  category = ''
}) {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  // AI Suggestion State
  const [aiSuggestions, setAiSuggestions] = useState(null); // { suggested_tags: [], reasoning: '', isFallback: false }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    api.get('/tags')
      .then(data => {
        setCategories(data.categories || {});
      })
      .catch(err => console.error('Failed to load micro-tags:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleFetchAiSuggestions = async () => {
    setAiError('');
    setAiSuggestions(null);

    if (!title || !title.trim()) {
      setAiError('Please enter a game title before requesting AI tag suggestions.');
      return;
    }
    if (!description || !description.trim()) {
      setAiError('Please enter a game description before requesting AI tag suggestions.');
      return;
    }

    setAiLoading(true);
    try {
      const data = await api.post('/ai/suggest-tags', {
        title: title.trim(),
        description: description.trim(),
        category: category || 'General'
      });

      if (data.suggestions) {
        setAiSuggestions({
          suggested_tags: data.suggestions.suggested_tags || [],
          reasoning: data.suggestions.reasoning || '',
          isFallback: Boolean(data.suggestions.isFallback)
        });
      }
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI tag suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  const acceptSuggestedTag = (tagToAccept) => {
    const cleanTag = tagToAccept.trim();
    if (cleanTag && !selectedTags.includes(cleanTag)) {
      onChange([...selectedTags, cleanTag]);
    }
    // Remove from suggestions list once accepted
    if (aiSuggestions) {
      setAiSuggestions({
        ...aiSuggestions,
        suggested_tags: aiSuggestions.suggested_tags.filter(t => t !== tagToAccept)
      });
    }
  };

  const dismissSuggestedTag = (tagToDismiss) => {
    if (aiSuggestions) {
      setAiSuggestions({
        ...aiSuggestions,
        suggested_tags: aiSuggestions.suggested_tags.filter(t => t !== tagToDismiss)
      });
    }
  };

  const startEditingTag = (index, currentTag) => {
    setEditingIndex(index);
    setEditText(currentTag);
  };

  const saveEditedTag = (originalTag) => {
    const cleanEdit = editText.trim();
    if (cleanEdit) {
      acceptSuggestedTag(cleanEdit);
      dismissSuggestedTag(originalTag);
    }
    setEditingIndex(null);
    setEditText('');
  };

  if (loading) {
    return <div className="tag-selector__loading">Loading available micro-tags...</div>;
  }

  const query = filterQuery.toLowerCase().trim();

  return (
    <div className="tag-selector">
      <div className="tag-selector__header">
        <div className="tag-selector__title-wrap">
          <h4 className="tag-selector__title">Micro-Tags</h4>
          <span className="tag-selector__count">
            {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn--ai-suggest"
            onClick={handleFetchAiSuggestions}
            disabled={aiLoading}
          >
            {aiLoading ? 'Analyzing...' : '✨ Suggest Tags with AI'}
          </button>
          <input
            type="text"
            className="input input--sm tag-selector__filter"
            placeholder="Filter tags..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
          />
        </div>
      </div>

      {aiError && <div className="form-error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{aiError}</div>}

      {/* AI Smart Tag Suggestions Panel (NEVER auto-applied per Prompt Spec) */}
      {aiSuggestions && (
        <div className={`ai-suggest-panel ${aiSuggestions.isFallback ? 'ai-suggest-panel--fallback' : ''}`}>
          <div className="ai-suggest-header">
            <span className={`ai-suggest-badge ${aiSuggestions.isFallback ? 'ai-suggest-badge--fallback' : ''}`}>
              🤖 {aiSuggestions.isFallback ? 'Common tags for this genre' : 'AI-suggested micro-tags'}
            </span>
            <button
              type="button"
              className="ai-suggest-item__btn ai-suggest-btn--dismiss"
              onClick={() => setAiSuggestions(null)}
            >
              Close Suggestions
            </button>
          </div>

          {aiSuggestions.reasoning && (
            <div className="ai-suggest-reasoning">
              "{aiSuggestions.reasoning}"
            </div>
          )}

          {aiSuggestions.suggested_tags.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0 }}>All suggested tags accepted or dismissed.</p>
          ) : (
            <div className="ai-suggest-list">
              {aiSuggestions.suggested_tags.map((tag, idx) => {
                const isEditing = editingIndex === idx;
                const alreadySelected = selectedTags.includes(tag);

                return (
                  <div key={idx} className="ai-suggest-item">
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="ai-suggest-edit-input"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="ai-suggest-item__btn ai-suggest-btn--accept"
                          onClick={() => saveEditedTag(tag)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="ai-suggest-item__btn ai-suggest-btn--dismiss"
                          onClick={() => setEditingIndex(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>#{tag}</span>
                        {alreadySelected ? (
                          <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>✓ Accepted</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="ai-suggest-item__btn ai-suggest-btn--accept"
                              title="Accept and add tag"
                              onClick={() => acceptSuggestedTag(tag)}
                            >
                              + Accept
                            </button>
                            <button
                              type="button"
                              className="ai-suggest-item__btn ai-suggest-btn--edit"
                              title="Edit tag text before accepting"
                              onClick={() => startEditingTag(idx, tag)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="ai-suggest-item__btn ai-suggest-btn--dismiss"
                              title="Dismiss suggestion"
                              onClick={() => dismissSuggestedTag(tag)}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Static Micro-Tag Categories */}
      <div className="tag-selector__categories">
        {Object.entries(categories).map(([catName, tags]) => {
          const matchingTags = query
            ? tags.filter(t => t.toLowerCase().includes(query))
            : tags;

          if (matchingTags.length === 0) return null;

          return (
            <div key={catName} className="tag-category">
              <h5 className="tag-category__name">{catName}</h5>
              <div className="tag-category__tags">
                {matchingTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-chip ${isSelected ? 'tag-chip--selected' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      <span className="tag-chip__checkbox">
                        {isSelected ? '✓' : '+'}
                      </span>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
