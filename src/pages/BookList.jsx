import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import BookRow from '../components/BookRow';
import './BookList.css';

function BookList() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

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

  const query = search.trim().toLowerCase();

  const visibleBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.includes(query);
    const matchesAvailability = !onlyAvailable || book.availableQty > 0;
    return matchesSearch && matchesAvailability;
  });

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

      {loading && <p className="status">Loading the catalog...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {!loading && !error && visibleBooks.length === 0 && (
        <p className="status">
          {books.length === 0
            ? 'No books yet. A librarian can add the first one.'
            : 'No books match your search. Try a different title, author, or ISBN.'}
        </p>
      )}

      <ul className="book-list">
        {visibleBooks.map((book) => (
          <BookRow key={book._id} book={book} />
        ))}
      </ul>
    </div>
  );
}

export default BookList;