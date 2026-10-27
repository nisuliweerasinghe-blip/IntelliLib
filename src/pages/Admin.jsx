import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import './Admin.css';

const ROLE_LABEL = { admin: 'Admin', librarian: 'Librarian', student: 'Student' };
const ROLE_ORDER = { admin: 0, librarian: 1, student: 2 };

const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;

const emptyForm = { name: '', email: '', password: '', role: 'librarian' };

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (err) {
        setLoadError('Could not load the accounts. Check that the backend is running and try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const res = await api.post('/users/staff', form);
      setUsers((list) => [res.data, ...list]);
      setCreated({ name: res.data.name, email: res.data.email, role: res.data.role });
      setForm(emptyForm);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create this account. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const count = (role) => users.filter((u) => u.role === role).length;

  const query = search.trim().toLowerCase();

  const visible = users
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter(
      (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
    )
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));

  return (
    <div>
      <h1 className="page-title">Admin</h1>
      <p className="page-sub">Create staff accounts and see everyone who uses the library.</p>

      <section className="admin-section">
        <h2>Create a staff account</h2>

        {created && (
          <div className="slip" role="status">
            <h2>Account created</h2>
            <dl>
              <dt>Name</dt>
              <dd>{created.name}</dd>
              <dt>Email</dt>
              <dd>{created.email}</dd>
              <dt>Role</dt>
              <dd>{ROLE_LABEL[created.role]}</dd>
            </dl>
            <p className="slip-note">
              Give them the password in person. There is no password reset yet, so keep a note of it.
            </p>
          </div>
        )}

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="desk-field">
            <span>Full name</span>
            <input name="name" type="text" value={form.name} onChange={handleChange} required />
          </label>

          <label className="desk-field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>

          <label className="desk-field">
            <span>Starting password</span>
            <input
              name="password"
              type="password"
              minLength={6}
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="desk-field">
            <span>Role</span>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="librarian">Librarian: runs the desk and the dashboard</option>
              <option value="admin">Admin: everything a librarian can do, plus accounts and deleting books</option>
            </select>
          </label>

          {formError && <p className="form-error" role="alert">{formError}</p>}

          <div className="desk-actions">
            <button className="btn-solid" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2>Accounts</h2>

        {!loading && !loadError && (
          <p className="admin-count">
            {plural(count('admin'), 'admin')}, {plural(count('librarian'), 'librarian')},{' '}
            {plural(count('student'), 'student')}
          </p>
        )}

        <div className="admin-filters">
          <label className="desk-field">
            <span>Search by name or email</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>

          <label className="desk-field">
            <span>Show</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">Everyone</option>
              <option value="admin">Admins</option>
              <option value="librarian">Librarians</option>
              <option value="student">Students</option>
            </select>
          </label>
        </div>

        {loading && <p className="status">Loading accounts...</p>}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}

        {!loading && !loadError && visible.length === 0 && (
          <p className="status">No accounts match. Try a different name, email, or role.</p>
        )}

        <ul className="loan-list">
          {visible.map((u) => (
            <li key={u._id} className="loan">
              <div>
                <p className="loan-name">{u.name}</p>
                <p className="loan-due">{u.email}</p>
                {u.role === 'student' && u.outstandingFine > 0 && (
                  <p className="loan-due late">Owes Rs. {u.outstandingFine}</p>
                )}
              </div>
              <span className={`role-tag ${u.role}`}>{ROLE_LABEL[u.role]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Admin;