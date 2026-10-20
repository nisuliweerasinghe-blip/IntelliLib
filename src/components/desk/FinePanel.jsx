import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { formatDate } from '../../utils/formatDate';
import { FINE_LIMIT } from '../../utils/constants';

function FinePanel() {
  const [owing, setOwing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users');
        const list = res.data
          .filter((u) => u.role === 'student' && u.outstandingFine > 0)
          .sort((a, b) => b.outstandingFine - a.outstandingFine);
        setOwing(list);
      } catch (err) {
        setError('Could not load the list of students. Check that the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selected = owing.find((s) => s._id === selectedId);

  const choose = (student) => {
    setSelectedId(student._id);
    setAmount(String(student.outstandingFine));
    setReceipt(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paying = Number(amount);

    if (!(paying > 0) || paying > selected.outstandingFine) {
      setError(`Enter an amount between 1 and ${selected.outstandingFine}.`);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/payments', {
        studentId: selected._id,
        amount: paying,
        method
      });

      const remaining = res.data.remainingFine;

      let note = '';
      if (selected.outstandingFine > FINE_LIMIT && remaining <= FINE_LIMIT) {
        note = 'This student can borrow books again.';
      } else if (remaining > FINE_LIMIT) {
        note = `Borrowing stays blocked until the balance is Rs. ${FINE_LIMIT} or less.`;
      }

      setReceipt({
        name: selected.name,
        amount: paying,
        method,
        date: formatDate(res.data.payment.paidAt),
        remaining,
        note
      });

      setOwing((list) =>
        remaining > 0
          ? list.map((s) => (s._id === selected._id ? { ...s, outstandingFine: remaining } : s))
          : list.filter((s) => s._id !== selected._id)
      );

      setSelectedId('');
      setAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not record this payment. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {receipt && (
        <div className="slip" role="status">
          <h2>Payment recorded</h2>
          <dl>
            <dt>Student</dt>
            <dd>{receipt.name}</dd>
            <dt>Paid</dt>
            <dd>Rs. {receipt.amount}</dd>
            <dt>Method</dt>
            <dd>{receipt.method === 'cash' ? 'Cash' : 'Card'}</dd>
            <dt>Date</dt>
            <dd>{receipt.date}</dd>
            <dt>Still owed</dt>
            <dd>{receipt.remaining > 0 ? `Rs. ${receipt.remaining}` : 'Nothing, fully paid'}</dd>
          </dl>
          {receipt.note && <p className="slip-note">{receipt.note}</p>}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {!selected ? (
        loading ? (
          <p className="status">Loading students...</p>
        ) : owing.length === 0 ? (
          <p className="status">No student owes a fine right now.</p>
        ) : (
          <ul className="loan-list">
            {owing.map((s) => {
              const blocked = s.outstandingFine > FINE_LIMIT;

              return (
                <li key={s._id} className="loan">
                  <div>
                    <p className="loan-name">{s.name}</p>
                    <p className="loan-due">{s.email}</p>
                    <p className={`loan-due${blocked ? ' late' : ''}`}>
                      Owes Rs. {s.outstandingFine}
                      {blocked ? '. Cannot borrow until this is paid down.' : ''}
                    </p>
                  </div>
                  <button className="btn-solid" onClick={() => choose(s)}>
                    Collect payment
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="picked">
            <h2>{selected.name}</h2>
            <p>{selected.email}</p>
            <p>Owes Rs. {selected.outstandingFine}</p>
          </div>

          <label className="desk-field">
            <span>Amount to collect (Rs.)</span>
            <input
              type="number"
              min="1"
              max={selected.outstandingFine}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>

          <label className="desk-field">
            <span>Payment method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </label>

          <div className="desk-actions">
            <button className="btn-solid" type="submit" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record payment'}
            </button>
            <button
              className="btn-line"
              type="button"
              onClick={() => {
                setSelectedId('');
                setError('');
              }}
            >
              Choose a different student
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default FinePanel;