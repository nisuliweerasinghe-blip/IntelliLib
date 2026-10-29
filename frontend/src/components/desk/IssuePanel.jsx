import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import BookLookup from '../BookLookup';
import { formatDate } from '../../utils/formatDate';

function IssuePanel() {
  const [book, setBook] = useState(null);
  const [held, setHeld] = useState([]);
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

  const handleFound = async (found) => {
    setBook(found);
    setHeld([]);
    setSlip(null);
    setError('');
    setStudentId('');

    try {
      const res = await api.get(`/reservations/ready/${found._id}`);
      setHeld(res.data);
    } catch (err) {
      setError('Could not check for copies set aside for reservations. Scan the book again.');
    }
  };

  const issueTo = async (id, name) => {
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/borrow/issue', { bookId: book._id, studentId: id });

      setSlip({
        title: book.title,
        borrower: name,
        due: formatDate(res.data.record.dueDate),
        reserved: res.data.collectedReservation
      });
      setBook(null);
      setHeld([]);
      setStudentId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not issue this book. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const borrower = students.find((s) => s._id === studentId);
    issueTo(studentId, borrower.name);
  };

  const onShelf = book && book.availableQty > 0;

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
          {slip.reserved && (
            <p className="slip-note">This was the copy set aside for their reservation.</p>
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
            <p>{book.availableQty} of {book.totalQty} on the shelf</p>
          </div>

          {held.length > 0 && (
            <div>
              <h3 className="held-title">Set aside for reservations</h3>
              <p className="held-note">
                These copies are not on the shelf. Give each one to the student it is held for.
              </p>

              <ul className="loan-list">
                {held.map((h) => (
                  <li key={h._id} className="loan">
                    <div>
                      <p className="loan-name">{h.student?.name || 'Unknown student'}</p>
                      <p className="loan-due">Held until {formatDate(h.holdUntil)}</p>
                    </div>
                    <button
                      className="btn-solid"
                      onClick={() => issueTo(h.student._id, h.student.name)}
                      disabled={submitting || !h.student}
                    >
                      {submitting ? 'Issuing...' : `Issue to ${h.student?.name}`}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onShelf ? (
            <form onSubmit={handleSubmit}>
              <label className="desk-field">
                <span>{held.length > 0 ? 'Or issue a shelf copy to' : 'Borrower'}</span>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                  <option value="">Choose a student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </label>

              <div className="desk-actions">
                <button className="btn-solid" type="submit" disabled={submitting}>
                  {submitting ? 'Issuing...' : 'Issue book'}
                </button>
              </div>
            </form>
          ) : (
            <p className="held-note">
              {held.length > 0
                ? 'No other copies are on the shelf.'
                : 'No copies are on the shelf, so this book cannot be issued right now.'}
            </p>
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

export default IssuePanel;