import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import BookLookup from '../BookLookup';
import { formatDate } from '../../utils/formatDate';

function IssuePanel() {
  const [book, setBook] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await api.get('/users');
        setStudents(res.data.filter((u) => u.role === 'student'));
      } catch (err) {
        setError('Could not load the list of students. Check that the backend is running.');
      }
    };

    loadStudents();
  }, []);

  const handleFound = (found) => {
    setBook(found);
    setSlip(null);
    setError('');
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/borrow/issue', { bookId: book._id, studentId });
      const borrower = students.find((s) => s._id === studentId);

      setSlip({
        title: book.title,
        borrower: borrower.name,
        due: formatDate(res.data.record.dueDate)
      });
      setBook(null);
      setStudentId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not issue this book. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canIssue = book && book.availableQty > 0;

  return (
    <div>
      {slip && (
        <div className="slip" role="status">
          <h2>Book issued</h2>
          <dl>
            <dt>Book</dt>
            <dd>{slip.title}</dd>
            <dt>Borrower</dt>
            <dd>{slip.borrower}</dd>
            <dt>Due back</dt>
            <dd>{slip.due}</dd>
          </dl>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {!book ? (
        <BookLookup onFound={handleFound} />
      ) : (
        <form onSubmit={handleIssue}>
          <div className="picked">
            <h2>{book.title}</h2>
            <p>{book.author}</p>
            <p>{book.availableQty} of {book.totalQty} on the shelf</p>
          </div>

          {canIssue ? (
            <label className="desk-field">
              <span>Borrower</span>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">Choose a student</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="form-error">
              No copies are on the shelf, so this book cannot be issued right now.
            </p>
          )}

          <div className="desk-actions">
            {canIssue && (
              <button className="btn-solid" type="submit" disabled={submitting}>
                {submitting ? 'Issuing...' : 'Issue book'}
              </button>
            )}
            <button className="btn-line" type="button" onClick={() => setBook(null)}>
              Scan a different book
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default IssuePanel;