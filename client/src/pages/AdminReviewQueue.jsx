import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import './AdminReviewQueue.css';

export default function AdminReviewQueue() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [triageNote, setTriageNote] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [triageLoading, setTriageLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch admin submission queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/submissions');
      setSubmissions(data.submissions || []);
      if (data.submissions && data.submissions.length > 0 && !selectedId) {
        setSelectedId(data.submissions[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load submission queue.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  // Fetch submission details and AI triage note when selectedId changes
  const fetchSubmissionDetails = useCallback(async (id) => {
    if (!id) return;
    try {
      setTriageLoading(true);
      setTriageNote(null);
      setError('');
      setSuccess('');

      // Fetch submission detail
      const data = await api.get(`/admin/submissions/${id}`);
      setSubmissionDetail(data.submission);
      setReviewNotes(data.submission.reviewNotes || '');

      // Fetch AI Triage Note from /api/ai/triage/:submissionId
      try {
        const triageData = await api.post(`/ai/triage/${id}`);
        setTriageNote(triageData.triage);
      } catch (triageErr) {
        console.warn('AI triage note fetch failed:', triageErr.message);
        // Set fallback triage note state
        setTriageNote({
          isFallback: true,
          summary: 'AI triage unavailable — manual review required.',
          risk_flags: [],
          missing_info: [],
          suggested_action: 'needs_admin_attention'
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch submission details.');
    } finally {
      setTriageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (selectedId) {
      fetchSubmissionDetails(selectedId);
    }
  }, [selectedId, fetchSubmissionDetails]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-queue-page">
        <h2>Access Denied</h2>
        <p>You must be an administrator to view the submission review queue.</p>
      </div>
    );
  }

  const handleReviewDecision = async (statusDecision) => {
    if (!selectedId) return;
    setError('');
    setSuccess('');

    if ((statusDecision === 'needs_changes' || statusDecision === 'rejected') && !reviewNotes.trim()) {
      setError(`Review notes are required when marking a submission as "${statusDecision}".`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/submissions/${selectedId}/review`, {
        status: statusDecision,
        reviewNotes: reviewNotes.trim()
      });

      setSuccess(res.message || `Submission decision "${statusDecision}" saved.`);
      fetchQueue();
      fetchSubmissionDetails(selectedId);
    } catch (err) {
      setError(err.message || 'Failed to update review status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-queue-page">
      <div className="admin-queue-header">
        <h1 className="admin-queue-title">Admin Submission Review Queue</h1>
        <p className="admin-queue-subtitle">
          Inspect incoming game submissions with AI-powered content triage and safety risk signals.
        </p>
      </div>

      {loading ? (
        <div className="admin-queue-loading">Loading submission queue...</div>
      ) : (
        <div className="admin-queue-layout">
          {/* Submission Queue List Sidebar */}
          <div className="submission-list-panel">
            <h3 className="panel-title">Pending Submissions ({submissions.length})</h3>
            <div className="queue-items">
              {submissions.length === 0 ? (
                <p className="no-items">No submissions in queue.</p>
              ) : (
                submissions.map((sub) => (
                  <button
                    key={sub.id}
                    className={`queue-item ${selectedId === sub.id ? 'queue-item--selected' : ''}`}
                    onClick={() => setSelectedId(sub.id)}
                  >
                    <div className="queue-item__game">{sub.gameTitle}</div>
                    <div className="queue-item__meta">
                      <span>v{sub.versionNumber}</span>
                      <span className={`badge-status badge-status--${sub.status}`}>
                        {sub.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Submission Details & AI Triage Panel */}
          <div className="submission-detail-panel">
            {!submissionDetail ? (
              <p>Select a submission from the list to begin review.</p>
            ) : (
              <>
                <div className="detail-header">
                  <h2 className="detail-title">{submissionDetail.gameTitle}</h2>
                  <div className="detail-sub">
                    Submitted by <strong>{submissionDetail.developerUsername}</strong> ({submissionDetail.developerEmail}) on {new Date(submissionDetail.submittedAt).toLocaleString()}
                  </div>
                </div>

                {error && <div className="form-error">{error}</div>}
                {success && <div className="form-success">{success}</div>}

                {/* AI Triage Card (prominently labeled per Prompt Spec & Architecture) */}
                <div className={`ai-triage-card ${triageNote?.isFallback ? 'ai-triage-card--fallback' : ''}`}>
                  <div className="ai-triage-header">
                    <span className={`ai-label-badge ${triageNote?.isFallback ? 'ai-label-badge--fallback' : ''}`}>
                      🤖 {triageNote?.isFallback ? 'AI Triage Unavailable — Manual Review Required' : 'AI-generated — review required'}
                    </span>
                    {triageNote?.suggested_action && (
                      <span className={`action-pill action-pill--${triageNote.suggested_action}`}>
                        {triageNote.suggested_action === 'proceed_normally' ? '✓ Proceed Normally' : '⚠️ Attention Required'}
                      </span>
                    )}
                  </div>

                  {triageLoading ? (
                    <p className="triage-loading">Running AI content safety triage...</p>
                  ) : triageNote ? (
                    <>
                      <div className="ai-triage-summary">
                        <strong>AI Summary:</strong> {triageNote.summary}
                      </div>

                      {triageNote.risk_flags && triageNote.risk_flags.length > 0 && (
                        <div>
                          <div className="triage-section-title">Risk Flags Identified:</div>
                          <ul className="triage-list">
                            {triageNote.risk_flags.map((flag, idx) => (
                              <li key={idx}>{flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {triageNote.missing_info && triageNote.missing_info.length > 0 && (
                        <div>
                          <div className="triage-section-title">Missing Information:</div>
                          <ul className="triage-list">
                            {triageNote.missing_info.map((info, idx) => (
                              <li key={idx}>{info}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="triage-loading">AI triage note pending...</p>
                  )}
                </div>

                {/* Submission Metadata */}
                <div className="submission-fields">
                  <div className="field-group">
                    <label>Version Number</label>
                    <div>v{submissionDetail.versionNumber}</div>
                  </div>
                  <div className="field-group">
                    <label>Genre / Category</label>
                    <div>{submissionDetail.gameGenre || 'N/A'}</div>
                  </div>
                  <div className="field-group">
                    <label>Price</label>
                    <div>₹{submissionDetail.gamePrice?.toFixed(2)}</div>
                  </div>
                  <div className="field-group">
                    <label>Current Status</label>
                    <div className={`badge-status badge-status--${submissionDetail.status}`}>
                      {submissionDetail.status}
                    </div>
                  </div>
                </div>

                <div className="field-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Game Description</label>
                  <div style={{ whiteSpace: 'pre-line', background: 'rgba(15, 23, 42, 0.4)', padding: '0.8rem', borderRadius: '6px' }}>
                    {submissionDetail.gameDescription || 'No description provided.'}
                  </div>
                </div>

                <div className="field-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Developer Changelog</label>
                  <div style={{ whiteSpace: 'pre-line', background: 'rgba(15, 23, 42, 0.4)', padding: '0.8rem', borderRadius: '6px' }}>
                    {submissionDetail.changelog || 'No changelog provided.'}
                  </div>
                </div>

                {/* Admin Review Decision Controls */}
                <div className="admin-action-section">
                  <h3 className="panel-title">Review Decision & Feedback</h3>
                  <div className="form-group">
                    <label className="label">Admin Feedback Notes (Required for Changes / Rejection)</label>
                    <textarea
                      className="input textarea"
                      rows={3}
                      placeholder="Provide clear notes for the developer explaining approval or required changes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  <div className="admin-action-buttons">
                    <button
                      className="btn btn--approve"
                      onClick={() => handleReviewDecision('approved')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving...' : '✓ Approve & Publish'}
                    </button>

                    <button
                      className="btn btn--changes"
                      onClick={() => handleReviewDecision('needs_changes')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving...' : '✏️ Request Changes'}
                    </button>

                    <button
                      className="btn btn--reject"
                      onClick={() => handleReviewDecision('rejected')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving...' : '✕ Reject Submission'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
