import { useState } from 'react';
import api from '../../api/axiosInstance';
import useCategories from '../../hooks/useCategories';

const emptyForm = { title: '', author: '', isbn: '', totalQty: 1, category: '' };

function AddBookPanel() {
  const [form, setForm] = useState(emptyForm);
  const [added, setAdded] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { categories, failed } = useCategories();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/books', { ...form, totalQty: Number(form.totalQty) });
      setAdded(res.data);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add this book. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {added && (
        <div className="qr-panel" role="status">
          <img src={added.qrCode} alt={`QR code for ${added.title}`} width="160" height="160" />
          <div>
            <p><strong>{added.title}</strong> was added to the catalog.</p>
            <p>Print this QR code and stick it on the book.</p>
            <a className="btn-line" href={added.qrCode} download={`${added.isbn}-qr.png`}>
              Download QR code
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
          <span>Category</span>
          <select name="category" value={form.category} onChange={handleChange}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </label>
        {failed && (
          <p className="edit-hint">Could not load the categories, so this book will be saved without one.</p>
        )}

        <label className="desk-field">
          <span>Number of copies</span>
          <input name="totalQty" type="number" min="1" value={form.totalQty} onChange={handleChange} required />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="desk-actions">
          <button className="btn-solid" type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add book'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddBookPanel;