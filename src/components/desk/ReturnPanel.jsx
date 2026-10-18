import { useState } from 'react';
import api from '../../api/axiosInstance';
import BookLookup from '../BookLookup';
import { formatDate } from '../../utils/formatDate';

function ReturnPanel() {
  const [book, setBook] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [returningId, setReturningId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadLoans = async (bookId) => {
    setLoadingLoans(true);

    try {
      const res = await api.get(`/borrow/active/${bookId}`);
      setLoans(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the loans for this book.');
    } finally {
      setLoadingLoans(false);
    }
  };

  const handleFound = (found) => {
    setBook(found);
    setResult(null);
    setError('');
    loadLoans(found._id);
  };

  const handleReturn = async (loan) => {
    setError('');
    setReturningId(loan._id);

    try {
      const res = await api.post('/borrow/return', { recordId: loan._id });
      setResult({
        title: book.title,
        student: loan.student?.name,
        fine: res.data.fine,
        handedToReservation: res.data.handedToReservation
      });
      await loadLoans(book._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not return this book. Try again.');
    } finally {
      setReturningId('');
    }
  };

  return (
    <div>
      {result && (
        <div className="row-note" role="status">
          <p>
            "{result.title}" returned{result.student ? ` by ${result.student}` : ''}.{' '}
            {result.fine > 0 ? `Late fine: Rs. ${result.fine}.` : 'On time, no fine.'}
          </p>
          {result.handedToReservation && (
            <p>This copy has been set aside for the next person on the waiting list.</p>
          )}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {!book ? (
        <BookLookup onFound={handleFound} />
      ) : (
        <div>
          <div className="picked">
            <h2>{book.title}</h2>
            <p>{book.author}</p>
          </div>

          {loadingLoans ? (
            <p className="status">Loading loans...</p>
          ) : loans.length === 0 ? (
            <p className="status">No one has this book checked out right now.</p>
          ) : (
            <ul className="loan-list">
              {loans.map((loan) => {
                const daysLate = Math.floor((Date.now() - new Date(loan.dueDate)) / 86400000);
                const late = daysLate > 0;

                return (
                  <li key={loan._id} className="loan">
                    <div>
                      <p className="loan-name">{loan.student?.name || 'Unknown student'}</p>
                      <p className={`loan-due ${late ? 'late' : ''}`}>
                        {late
                          ? `Overdue by ${daysLate} ${daysLate === 1 ? 'day' : 'days'}`
                          : `Due ${formatDate(loan.dueDate)}`}
                      </p>
                    </div>
                    <button
                      className="btn-solid"
                      onClick={() => handleReturn(loan)}
                      disabled={returningId === loan._id}
                    >
                      {returningId === loan._id ? 'Returning...' : 'Return'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="desk-actions">
            <button className="btn-line" type="button" onClick={() => setBook(null)}>
              Scan a different book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnPanel;