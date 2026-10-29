import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatDate';
import { dueStatus } from '../utils/dueStatus';
import './MyBooks.css';
import { FINE_LIMIT } from '../utils/constants';

function MyBooks() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fine, setFine] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [loansRes, reservationsRes, meRes, paymentsRes] = await Promise.all([
          api.get('/borrow/mine'),
          api.get('/reservations/mine'),
          api.get('/users/me'),
          api.get(`/payments/${user._id}`)
        ]);

        setLoans(loansRes.data);
        setReservations(reservationsRes.data);
        setFine(meRes.data.outstandingFine || 0);
        setPayments(paymentsRes.data);
      } catch (err) {
        setError('Could not load your books. Check that the backend is running and try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user._id]);

  const handleCancel = async (reservation) => {
  setCancelError('');
  setCancellingId(reservation._id);

  try {
    await api.delete(`/reservations/${reservation._id}`);
    setReservations((list) => list.filter((r) => r._id !== reservation._id));
  } catch (err) {
    setCancelError(err.response?.data?.error || 'Could not cancel this reservation. Try again.');
  } finally {
    setCancellingId('');
  }
};

  const current = loans.filter((l) => l.status === 'issued');
  const past = loans.filter((l) => l.status === 'returned').slice(0, 10);
  const ready = reservations.filter((r) => r.status === 'ready');
  const waiting = reservations.filter((r) => r.status === 'waiting');

  if (loading) return <p className="status">Loading your books...</p>;
  if (error) return <p className="form-error" role="alert">{error}</p>;

  return (
    <div>
      <h1 className="page-title">My books</h1>
      <p className="page-sub">What you have borrowed, what you are waiting for, and what you owe.</p>

      {fine > 0 && (
        <div className="fine-notice" role="status">
          <p><strong>You owe Rs. {fine} in late fines.</strong> Pay at the library desk.</p>
          {fine > FINE_LIMIT && (
            <p>You cannot borrow more books until your fines are Rs. {FINE_LIMIT} or less.</p>
          )}
        </div>
      )}

      <section className="ledger">
        <h2>Borrowed now</h2>
        {current.length === 0 ? (
          <p className="status">
            You have no books checked out. Browse the <Link to="/">catalog</Link> to find your next read.
          </p>
        ) : (
          <ul className="ledger-list">
            {current.map((loan) => {
              const s = dueStatus(loan.dueDate);
              return (
                <li key={loan._id} className="ledger-row">
                  <div className={`stamp ${s.level}`}>
                    <span className="stamp-label">Due back</span>
                    <span className="stamp-date">{formatDate(loan.dueDate)}</span>
                  </div>
                  <div className="ledger-info">
                    <h3>{loan.book?.title || 'Removed book'}</h3>
                    <p>{loan.book?.author}</p>
                    <p className={`due-text ${s.level}`}>{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ledger">
        <h2>Reservations</h2>

          {cancelError && <p className="form-error" role="alert">{cancelError}</p>}

          {ready.length + waiting.length === 0 ? (
            <p className="status">
              You have no reservations. When a book is checked out, use Reserve in the catalog to join its waiting list.
            </p>
          ) : (
            <ul className="ledger-list">
              {[...ready, ...waiting].map((r) => (
                <li key={r._id} className="ledger-row">
                  <div className="ledger-info">
                    <h3>{r.book.title}</h3>
                    <p>{r.book.author}</p>
                    {r.status === 'ready' ? (
                      <p className="due-text ok">
                        <strong>Ready to collect.</strong> A copy is set aside for you at the library desk until{' '}
                        {formatDate(r.holdUntil)}.
                      </p>
                    ) : (
                      <p className="due-text">Number {r.position} in line. We will email you when it is ready.</p>
                    )}
                  </div>

                  <button
                    className="btn-line"
                    onClick={() => handleCancel(r)}
                    disabled={cancellingId === r._id}
                  >
                    {cancellingId === r._id
                      ? 'Cancelling...'
                      : r.status === 'ready'
                        ? 'Give up this copy'
                        : 'Leave the waiting list'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

      {past.length > 0 && (
        <section className="ledger">
          <h2>Returned</h2>
          <ul className="ledger-list">
            {past.map((loan) => (
              <li key={loan._id} className="history-row">
                <div>
                  <h3>{loan.book?.title || 'Removed book'}</h3>
                  <p>Returned {formatDate(loan.returnedAt)}</p>
                </div>
                <p className={loan.fineAmount > 0 ? 'due-text late' : 'due-text'}>
                  {loan.fineAmount > 0 ? `Late fine Rs. ${loan.fineAmount}` : 'On time'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {payments.length > 0 && (
        <section className="ledger">
          <h2>Payments</h2>
          <ul className="ledger-list">
            {payments.map((p) => (
              <li key={p._id} className="history-row">
                <div>
                  <h3>Rs. {p.amount}</h3>
                  <p>Paid {formatDate(p.paidAt)} by {p.method}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default MyBooks;