import { useState } from 'react';
import api from '../api/axiosInstance';

function StaffTools({ book, canDelete, onUpdated, onDeleted }) {
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', totalQty: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const copiesOut = book.totalQty - book.availableQty;

  const openEdit = () => {
    if (mode === 'edit') {
      setMode(null);
      return;
    }
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      totalQty: book.totalQty
    });
    setError('');
    setMode('edit');
  };

  const openDelete = () => {
    setError('');
    setMode(mode === 'delete' ? null : 'delete');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await api.put(`/books/${book._id}`, {
        ...form,
        totalQty: Number(form.totalQty)
      });
      onUpdated(res.data);
      setMode(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your changes. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setBusy(true);

    try {
      await api.delete(`/books/${book._id}`);
      onDeleted(book._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete this book. Try again.');
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="staff-tools">
        <button type="button" className="btn-line" onClick={openEdit} aria-expanded={mode === 'edit'}>
          {mode === 'edit' ? 'Close editor' : 'Edit details'}
        </button>
        {canDelete && (
          <button
            type="button"
            className="btn-line btn-danger"
            onClick={openDelete}
            aria-expanded={mode === 'delete'}
          >
            Delete book
          </button>
        )}
      </div>

      {mode === 'edit' && (
        <form className="edit-panel" onSubmit={handleSave}>
          <label className="desk-field">
            <span>Title</span>
            <input name="title" type="text" value={form.title} onChange={handleChange} required />
          </label>

          <label className="desk-field">
            <span>Author</span>
            <input name="author" type="text" value={form.author} onChange={handleChange} required />
          </label>

          <label className="desk-field">
            <span>ISBN</span>
            <input name="isbn" type="text" value={form.isbn} onChange={handleChange} required />
          </label>

          <label className="desk-field">
            <span>Number of copies</span>
            <input
              name="totalQty"
              type="number"
              step="1"
              min={Math.max(1, copiesOut)}
              value={form.totalQty}
              onChange={handleChange}
              required
            />
          </label>

          <p className="edit-hint">
            {copiesOut > 0
              ? `${copiesOut} ${copiesOut === 1 ? 'copy is' : 'copies are'} checked out or set aside for a reservation, so the total cannot go below ${copiesOut}.`
              : 'No copies are checked out right now.'}
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="desk-actions">
            <button className="btn-solid" type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save changes'}
            </button>
            <button className="btn-line" type="button" onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'delete' && (
        <div className="confirm-panel" role="group" aria-label="Confirm delete">
          <p>
            Delete <strong>{book.title}</strong> from the catalog? Its borrowing history stays, but the
            title will show as a removed book. This cannot be undone.
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="desk-actions">
            <button
              className="btn-solid btn-danger-solid"
              type="button"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? 'Deleting...' : 'Delete book'}
            </button>
            <button className="btn-line" type="button" onClick={() => setMode(null)}>
              Keep this book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffTools;