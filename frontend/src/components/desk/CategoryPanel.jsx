import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;
const sortByName = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

function CategoryPanel() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [confirmId, setConfirmId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        setError('Could not load the categories. Check that the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      const res = await api.post('/categories', { name });
      setCategories((list) => sortByName([...list, res.data]));
      setName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add this category. Try again.');
    } finally {
      setAdding(false);
    }
  };

  const startRename = (category) => {
    setEditingId(category._id);
    setEditName(category.name);
    setConfirmId('');
    setError('');
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setError('');
    setBusyId(editingId);

    try {
      const res = await api.put(`/categories/${editingId}`, { name: editName });
      setCategories((list) =>
        sortByName(list.map((c) => (c._id === res.data._id ? res.data : c)))
      );
      setEditingId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not rename this category. Try again.');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (id) => {
    setError('');
    setBusyId(id);

    try {
      await api.delete(`/categories/${id}`);
      setCategories((list) => list.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete this category. Try again.');
    } finally {
      setConfirmId('');
      setBusyId('');
    }
  };

  return (
    <div>
      <form className="manual" onSubmit={handleAdd}>
        <label className="desk-field">
          <span>New category</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </label>
        <button className="btn-solid" type="submit" disabled={adding}>
          {adding ? 'Adding...' : 'Add category'}
        </button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading && <p className="status">Loading categories...</p>}

      {!loading && categories.length === 0 && (
        <p className="status">
          No categories yet. Add the first one above, then choose it when you add or edit a book.
        </p>
      )}

      <ul className="loan-list">
        {categories.map((c) => (
          <li key={c._id} className="loan">
            {editingId === c._id ? (
              <form className="cat-edit" onSubmit={handleRename}>
                <label className="desk-field">
                  <span>New name for {c.name}</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={40}
                    required
                  />
                </label>
                <button className="btn-solid" type="submit" disabled={busyId === c._id}>
                  {busyId === c._id ? 'Saving...' : 'Save'}
                </button>
                <button className="btn-line" type="button" onClick={() => setEditingId('')}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div>
                  <p className="loan-name">{c.name}</p>
                  <p className="loan-due">{plural(c.bookCount, 'book')}</p>
                </div>

                <div className="cat-actions">
                  {confirmId === c._id ? (
                    <>
                      <span className="cat-confirm">Delete {c.name}?</span>
                      <button
                        className="btn-solid btn-danger-solid"
                        onClick={() => handleDelete(c._id)}
                        disabled={busyId === c._id}
                      >
                        {busyId === c._id ? 'Deleting...' : 'Yes, delete'}
                      </button>
                      <button className="btn-line" onClick={() => setConfirmId('')}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-line" onClick={() => startRename(c)}>
                        Rename
                      </button>
                      {user.role === 'admin' && (
                        <button
                          className="btn-line btn-danger"
                          onClick={() => {
                            setConfirmId(c._id);
                            setError('');
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CategoryPanel;