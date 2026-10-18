import { useState } from 'react';
import api from '../api/axiosInstance';
import Scanner from './Scanner';

function BookLookup({ onFound }) {
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState('');

  const lookup = async (input) => {
    setError('');
    const value = input.trim();
    const isBookId = /^[a-f0-9]{24}$/i.test(value);

    try {
      if (isBookId) {
        const res = await api.get(`/books/${value}`);
        onFound(res.data);
      } else {
        const res = await api.get('/books');
        const match = res.data.find((b) => b.isbn === value);

        if (!match) {
          setError('No book matches this ID or ISBN. Check the number and try again.');
          return;
        }
        onFound(match);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No book in the library matches this code. Scan it again.');
      } else {
        setError('Cannot reach the server. Check that the backend is running.');
      }
    }
  };

  const handleManual = (e) => {
    e.preventDefault();
    lookup(manualId);
  };

  return (
    <div>
      <Scanner onScan={lookup} />

      <form className="manual" onSubmit={handleManual}>
        <label className="desk-field">
          <span>Or enter the book ID or ISBN</span>
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            required
          />
        </label>
        <button className="btn-line" type="submit">Find book</button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

export default BookLookup;