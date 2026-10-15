import { useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function BookRow({ book }) {
  const { user } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const onShelf = book.availableQty > 0;
  const isStaff = user.role === 'librarian' || user.role === 'admin';

  const handleReserve = async () => {
    setReserving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.post('/reservations', {
        bookId: book._id,
        studentId: user._id
      });
      setMessage({
        type: 'ok',
        text: `You are number ${res.data.queuePosition} in line. We will email you when it is ready.`
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Could not reserve this book. Try again.'
      });
    } finally {
      setReserving(false);
    }
  };

  return (
    <li className={`book-row ${onShelf ? 'on-shelf' : 'checked-out'}`}>
      <div className="book-main">
        <div className="book-info">
          <h2>{book.title}</h2>
          <p className="book-author">{book.author}</p>
          <p className="book-isbn">ISBN {book.isbn}</p>
        </div>

        <div className="book-status">
          <p className="copies">
            {onShelf
              ? `${book.availableQty} of ${book.totalQty} on the shelf`
              : 'All copies are out'}
          </p>

          <div className="book-actions">
            {!onShelf && !isStaff && (
              <button className="btn-solid" onClick={handleReserve} disabled={reserving}>
                {reserving ? 'Reserving...' : 'Reserve'}
              </button>
            )}
            {isStaff && book.qrCode && (
              <button
                className="btn-line"
                onClick={() => setShowQr(!showQr)}
                aria-expanded={showQr}
              >
                {showQr ? 'Hide QR code' : 'Show QR code'}
              </button>
            )}
          </div>
        </div>
      </div>

      {message.text && (
        <p className={message.type === 'ok' ? 'row-note' : 'form-error'} role="status">
          {message.text}
        </p>
      )}

      {showQr && (
        <div className="qr-panel">
          <img src={book.qrCode} alt={`QR code for ${book.title}`} width="160" height="160" />
          <p>Scan this at the counter to issue or return this book.</p>
        </div>
      )}
    </li>
  );
}

export default BookRow;