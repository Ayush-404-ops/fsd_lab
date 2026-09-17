import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './pages.css';

function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'player' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(form.username.trim(), form.email.trim(), form.password, form.role);
      } else {
        await login(form.email.trim(), form.password);
      }
      navigate(redirect, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to complete that request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Welcome to IndieVault</p>
        <h1>{isRegister ? 'Create your account.' : 'Welcome back.'}</h1>
        <p className="auth-card__lede">
          {isRegister ? 'Build a shelf for the independent games worth discovering.' : 'Sign in to manage your shelf and share your reviews.'}
        </p>

        {error && <div className="notice notice--error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="form-field">
              <span>Username</span>
              <input name="username" value={form.username} onChange={updateField} autoComplete="username" required />
            </label>
          )}
          <label className="form-field">
            <span>{isRegister ? 'Email' : 'Email or username'}</span>
            <input name="email" type={isRegister ? 'email' : 'text'} value={form.email} onChange={updateField} autoComplete={isRegister ? 'email' : 'username'} required />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={updateField} minLength={6} autoComplete={isRegister ? 'new-password' : 'current-password'} required />
          </label>
          {isRegister && (
            <label className="form-field">
              <span>Account type</span>
              <select name="role" value={form.role} onChange={updateField}>
                <option value="player">Player</option>
                <option value="developer">Developer</option>
              </select>
            </label>
          )}
          <button className="btn btn--primary btn--wide" type="submit" disabled={submitting}>
            {submitting ? 'Working...' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="auth-card__switch">
          {isRegister ? 'Already have an account?' : 'New to IndieVault?'}{' '}
          <Link to={isRegister ? `/login?redirect=${encodeURIComponent(redirect)}` : `/register?redirect=${encodeURIComponent(redirect)}`}>
            {isRegister ? 'Log in' : 'Create one'}
          </Link>
        </p>
      </section>
    </div>
  );
}

export default AuthPage;