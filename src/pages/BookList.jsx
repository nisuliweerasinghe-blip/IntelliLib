import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import useCategories from '../hooks/useCategories';
import BookRow from '../components/BookRow';
import './BookList.css';

function BookList() {
  const { user } = useAuth();
  const isStaff = user.role === 'librarian' || user.role === 'admin';
  const { categories } = useCategories(isStaff);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get('/books');
        setBooks(res.data);
      } catch (err) {
        setError('Could not load the catalog. Check that the backend is running and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const groups = {};
  books.forEach((book) => {
    const key = book.category?._id || 'none';
    if (!groups[key]) {
      groups[key] = { id: key, name: book.category?.name || 'Uncategorised', count: 0 };
    }
    groups[key].count += 1;
  });

  const labels = Object.values(groups).sort((a, b) => {
    if (a.id === 'none') return 1;
    if (b.id === 'none') return -1;
    return a.name.localeCompare(b.name);
  });

  const hasCategories = labels.some((l) => l.id !== 'none');

  const activeCategory = category === 'all' || groups[category] ? category : 'all';

  const query = search.trim().toLowerCase();

  const visibleBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.includes(query);
    const matchesAvailability = !onlyAvailable || book.availableQty > 0;
    const matchesCategory =
      activeCategory === 'all' ||
      (activeCategory === 'none' ? !book.category : book.category?._id === activeCategory);

    return matchesSearch && matchesAvailability && matchesCategory;
  });

  const handleUpdated = (updated) => {
    setBooks((list) => list.map((b) => (b._id === updated._id ? updated : b)));
  };

  const handleDeleted = (id) => {
    setBooks((list) => list.filter((b) => b._id !== id));
  };

  return (
    <div>
      <h1 className="page-title">Catalog</h1>
      {!loading && !error && (
        <p className="page-sub">{books.length} titles in the library</p>
      )}

      <div className="catalog-tools">
        <div className="field">
          <label htmlFor="search">Search by title, author or ISBN</label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Show only books on the shelf
        </label>
      </div>

      {hasCategories && (
        <div className="drawers" role="group" aria-label="Filter by category">
          <button
            type="button"
            className="drawer"
            aria-pressed={activeCategory === 'all'}
            onClick={() => setCategory('all')}
          >
            All <span className="drawer-count">{books.length}</span>
          </button>

          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              className="drawer"
              aria-pressed={activeCategory === label.id}
              onClick={() => setCategory(label.id)}
            >
              {label.name} <span className="drawer-count">{label.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="status">Loading the catalog...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {!loading && !error && visibleBooks.length === 0 && (
        <p className="status">
          {books.length === 0
            ? 'No books yet. A librarian can add the first one.'
            : 'No books match. Try a different search, category, or turn off the shelf filter.'}
        </p>
      )}

      <ul className="book-list">
        {visibleBooks.map((book) => (
          <BookRow
            key={book._id}
            book={book}
            categories={categories}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))}
      </ul>
    </div>
  );
}

export default BookList;