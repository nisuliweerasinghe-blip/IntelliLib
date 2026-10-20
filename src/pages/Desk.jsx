import { useState } from 'react';
import IssuePanel from '../components/desk/IssuePanel';
import ReturnPanel from '../components/desk/ReturnPanel';
import AddBookPanel from '../components/desk/AddBookPanel';
import './Desk.css';
import FinePanel from '../components/desk/FinePanel';

const TABS = [
  { id: 'issue', label: 'Issue a book' },
  { id: 'return', label: 'Return a book' },
  { id: 'add', label: 'Add a book' },
  { id: 'fines', label: 'Collect fines' }
];

function Desk() {
  const [tab, setTab] = useState('issue');

  return (
    <div>
      <h1 className="page-title">Library desk</h1>
      <p className="page-sub">Issue, return, and add books at the counter.</p>

      <div className="desk-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="desk-panel" role="tabpanel">
        {tab === 'issue' && <IssuePanel />}
        {tab === 'return' && <ReturnPanel />}
        {tab === 'add' && <AddBookPanel />}
        {tab === 'fines' && <FinePanel />}
      </div>
    </div>
  );
}

export default Desk;