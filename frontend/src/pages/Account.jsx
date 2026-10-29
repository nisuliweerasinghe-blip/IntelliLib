import { useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import './Account.css';

const ROLE_LABEL = { admin: 'Admin', librarian: 'Librarian', student: 'Student' };
const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setDone(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDone(false);

    if (form.newPassword !== form.confirmPassword) {
      setError('The new password and its confirmation do not match.');
      return;
    }

    setSaving(true);

    try {
      const res = await api.put('/users/me/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });

      localStorage.setItem('token', res.data.token);

      setForm(emptyForm);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change your password. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Account</h1>
      <p className="page-sub">Your details and your password.</p>

      <dl className="profile-list">
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Role</dt>
        <dd>{ROLE_LABEL[user.role]}</dd>
      </dl>

      <section className="account-section">
        <h2>Change your password</h2>

        <form className="account-form" onSubmit={handleSubmit}>
          <label className="desk-field">
            <span>Current password</span>
            <input
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </label>

          <label className="desk-field">
            <span>New password (at least 6 characters)</span>
            <input
              name="newPassword"
              type="password"
              minLength={6}
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="desk-field">
            <span>Type the new password again</span>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          {done && (
            <p className="row-note" role="status">
              Your password was changed. You stay signed in on this device, and any other device
              will need to sign in again.
            </p>
          )}

          <div className="desk-actions">
            <button className="btn-solid" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Account;