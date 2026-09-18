import { useState } from 'react';
import { api } from '../api';
import './TagSelector.css';

export default function TagSelector({
  selectedTags = [],
  onChange,
  title = '',
  description = '',
  category = ''
}) {
  const [customTagInput, setCustomTagInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // AI suggestions pool
  const [suggestedTags, setSuggestedTags] = useState([
    { id: 't1', label: 'Procedural Generation', status: 'idle', draftLabel: 'Procedural Generation' },
    { id: 't2', label: 'Synthesizer Soundtrack', status: 'idle', draftLabel: 'Synthwave OST' },
    { id: 't3', label: 'Difficult', status: 'idle', draftLabel: 'Difficult' },
    { id: 't4', label: 'Bullet Hell', status: 'idle', draftLabel: 'Bullet Hell' }
  ]);

  // Request AI suggestions from backend
  const handleSuggestTagsWithAI = async () => {
    setAiLoading(true);
    setAiMessage('');
    try {
      const data = await api.post('/ai/suggest-tags', {
        title: title.trim() || 'Untitled Indie Game',
        description: description.trim() || 'Fast-paced action roguelike with crafting mechanics',
        category: category || 'Action Roguelike'
      });

      if (data.suggestions && data.suggestions.suggested_tags?.length > 0) {
        const newPool = data.suggestions.suggested_tags
          .filter(t => !selectedTags.includes(t))
          .map((t, idx) => ({
            id: `ai_${Date.now()}_${idx}`,
            label: t,
            status: 'idle',
            draftLabel: t
          }));

        setSuggestedTags(newPool);
        setAiMessage(`✨ AI suggested ${newPool.length} contextual tags based on description`);
      } else {
        // Resilient fallback pool
        const fallbackPool = [
          'Procedural Generation', 'Retro Pixel', 'Soundtrack', 'Modular Weapons', 'Boss Rush'
        ].filter(t => !selectedTags.includes(t)).map((t, idx) => ({
          id: `fb_${idx}`,
          label: t,
          status: 'idle',
          draftLabel: t
        }));
        setSuggestedTags(fallbackPool);
        setAiMessage('✨ Generated 5 contextual tags (Resilient local model)');
      }
    } catch (err) {
      console.warn('AI tag suggestion error:', err.message);
      const fallbackPool = [
        'Procedural Generation', 'Retro Pixel', 'Synthwave OST', 'Difficult', 'Bullet Hell'
      ].filter(t => !selectedTags.includes(t)).map((t, idx) => ({
        id: `fb_${idx}`,
        label: t,
        status: 'idle',
        draftLabel: t
      }));
      setSuggestedTags(fallbackPool);
      setAiMessage('✨ Offline heuristics generated 5 suggested tags');
    } finally {
      setAiLoading(false);
    }
  };

  // Accept chip -> moves to applied tags
  const handleAccept = (chipId) => {
    const item = suggestedTags.find(t => t.id === chipId);
    if (!item) return;
    const finalLabel = item.status === 'editing' ? (item.draftLabel.trim() || item.label) : item.label;
    if (!selectedTags.includes(finalLabel)) {
      onChange([...selectedTags, finalLabel]);
    }
    setSuggestedTags(suggestedTags.filter(t => t.id !== chipId));
  };

  // Ignore chip -> dismiss
  const handleIgnore = (chipId) => {
    setSuggestedTags(suggestedTags.filter(t => t.id !== chipId));
  };

  // Enter edit mode
  const handleStartEdit = (chipId) => {
    setSuggestedTags(suggestedTags.map(t => {
      if (t.id === chipId) {
        return { ...t, status: 'editing', draftLabel: t.label };
      }
      return t;
    }));
  };

  // Save edit and accept immediately
  const handleSaveEdit = (chipId) => {
    handleAccept(chipId);
  };

  // Cancel edit
  const handleCancelEdit = (chipId) => {
    setSuggestedTags(suggestedTags.map(t => {
      if (t.id === chipId) {
        return { ...t, status: 'idle' };
      }
      return t;
    }));
  };

  // Remove active tag
  const handleRemoveTag = (tagToRemove) => {
    onChange(selectedTags.filter(t => t !== tagToRemove));
  };

  // Add manual tag
  const handleAddManualTag = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const val = customTagInput.trim();
      if (val && !selectedTags.includes(val)) {
        onChange([...selectedTags, val]);
        setCustomTagInput('');
      }
    }
  };

  return (
    <div className="tag-selector-container">
      {/* Active Applied Tags */}
      <div className="applied-tags-section">
        <span className="section-label">Active Applied Tags ({selectedTags.length}):</span>
        <div className="applied-tags-wrap">
          {selectedTags.map(tag => (
            <span key={tag} className="applied-tag-chip">
              <span>{tag}</span>
              <button
                type="button"
                className="chip-remove-btn"
                onClick={() => handleRemoveTag(tag)}
                title={`Remove ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
          {selectedTags.length === 0 && (
            <span className="no-tags-hint">No tags applied yet. Use AI suggestions below or add custom tags.</span>
          )}
        </div>
      </div>

      {/* Manual Tag Input Bar */}
      <div className="tag-input-row">
        <input
          type="text"
          className="form-input tag-text-input"
          placeholder="Type custom micro-tag (e.g. Twin-Stick Shooter) and press Enter..."
          value={customTagInput}
          onChange={(e) => setCustomTagInput(e.target.value)}
          onKeyDown={handleAddManualTag}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleAddManualTag}
          disabled={!customTagInput.trim()}
        >
          + Add Tag
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm btn-ai-suggest"
          onClick={handleSuggestTagsWithAI}
          disabled={aiLoading}
        >
          <span>{aiLoading ? 'Generating...' : '✨ Suggest Tags with AI'}</span>
        </button>
      </div>

      {aiMessage && (
        <div className="ai-message-row">
          <span>{aiMessage}</span>
        </div>
      )}

      {/* AI Suggestions Candidate Pool */}
      {suggestedTags.length > 0 && (
        <div className="ai-candidate-pool">
          <div className="candidate-header">
            <span className="ai-indicator-chip">
              <span>✨</span> Suggested Micro-Tags
            </span>
            <span className="candidate-hint">Never auto-applied — Accept, Edit inline, or Ignore</span>
          </div>

          <div className="candidate-chips-wrap">
            {suggestedTags.map(item => (
              <div key={item.id} className={`suggested-chip ${item.status === 'editing' ? 'editing' : ''}`}>
                {item.status === 'editing' ? (
                  <div className="chip-edit-controls">
                    <input
                      type="text"
                      className="chip-inline-input"
                      value={item.draftLabel}
                      autoFocus
                      onChange={(e) => {
                        const val = e.target.value;
                        setSuggestedTags(suggestedTags.map(t => t.id === item.id ? { ...t, draftLabel: val } : t));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') handleCancelEdit(item.id);
                      }}
                    />
                    <button
                      type="button"
                      className="chip-action-btn accept"
                      onClick={() => handleSaveEdit(item.id)}
                      title="Save & Accept"
                    >
                      ✓ Save
                    </button>
                    <button
                      type="button"
                      className="chip-action-btn dismiss"
                      onClick={() => handleCancelEdit(item.id)}
                      title="Cancel Edit"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="chip-label">{item.label}</span>
                    <div className="chip-actions-cluster">
                      <button
                        type="button"
                        className="chip-action-btn accept"
                        onClick={() => handleAccept(item.id)}
                        title="Accept & Add to active tags"
                      >
                        ✓ Accept
                      </button>
                      <button
                        type="button"
                        className="chip-action-btn edit"
                        onClick={() => handleStartEdit(item.id)}
                        title="Edit tag before applying"
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        className="chip-action-btn dismiss"
                        onClick={() => handleIgnore(item.id)}
                        title="Ignore suggestion"
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
