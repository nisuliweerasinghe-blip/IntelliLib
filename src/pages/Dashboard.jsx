import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';
import api from '../api/axiosInstance';
import OverdueCalendar from '../components/OverdueCalendar';
import { formatDate } from '../utils/formatDate';
import './Dashboard.css';

const COLORS = {
  primary: '#173F35',
  secondary: '#2E6B57',
  text: '#242B27',
  muted: '#5B655F',
  line: 'rgba(36, 43, 39, 0.18)'
};

const AXIS_TEXT = { fill: COLORS.muted, fontSize: 12 };

const TOOLTIP_STYLE = {
  background: '#FFFDF8',
  border: '1px solid rgba(36, 43, 39, 0.18)',
  borderRadius: 3,
  fontFamily: 'inherit'
};

const DAY = 24 * 60 * 60 * 1000;

const shorten = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [popular, setPopular] = useState([]);
  const [overdue, setOverdue] = useState({ records: [] });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const [summaryRes, popularRes, overdueRes, activityRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/most-borrowed'),
        api.get('/analytics/overdue'),
        api.get('/analytics/activity')
      ]);

      setSummary(summaryRes.data);
      setPopular(popularRes.data);
      setOverdue(overdueRes.data);
      setActivity(activityRes.data);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError('Could not load the latest numbers. Check that the backend is running and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) return <p className="status">Loading the dashboard...</p>;
  if (!summary) return <p className="form-error" role="alert">{error}</p>;

  const overdueLoans = overdue.records
    .map((record) => ({
      id: record._id,
      student: record.student?.name || 'Unknown student',
      email: record.student?.email,
      book: record.book?.title || 'Removed book',
      dueDate: record.dueDate,
      daysLate: Math.floor((Date.now() - new Date(record.dueDate)) / DAY)
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  const popularData = popular.map((item) => ({ ...item, label: shorten(item.title, 24) }));

  const activityData = activity.map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    })
  }));
  const issuedTotal = activity.reduce((sum, item) => sum + item.count, 0);

  return (
    <div>
      <div className="dash-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">How the library is doing right now. Numbers refresh every minute.</p>
        </div>

        <div className="dash-refresh">
          {updatedAt && (
            <span>
              Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn-line" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <dl className="glance">
        <div className="glance-row">
          <dt>Titles in the catalog</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{summary.totalBooks}</dd>
        </div>
        <div className="glance-row">
          <dt>Copies on the shelf</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{summary.totalAvailableCopies}</dd>
        </div>
        <div className="glance-row">
          <dt>Copies checked out</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{summary.totalIssued}</dd>
        </div>
        <div className={`glance-row${summary.totalOverdue > 0 ? ' alert' : ''}`}>
          <dt>Loans past their due date</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{summary.totalOverdue}</dd>
        </div>
      </dl>

      <section className="panel">
        <h2>Overdue loans</h2>

        {overdueLoans.length === 0 ? (
          <p className="status">Nothing is overdue. Every borrowed book is still within its loan period.</p>
        ) : (
          <>
            <OverdueCalendar records={overdue.records} />

            <ul className="overdue-list">
              {overdueLoans.map((loan) => (
                <li key={loan.id} className="overdue-row">
                  <div>
                    <h3>{loan.book}</h3>
                    <p>{loan.student}</p>
                  </div>

                  <div className="overdue-side">
                    <p className="overdue-days">
                      {loan.daysLate < 1
                        ? 'Overdue by less than a day'
                        : `Overdue by ${loan.daysLate} ${loan.daysLate === 1 ? 'day' : 'days'}`}
                    </p>
                    <p>Was due {formatDate(loan.dueDate)}</p>
                    {loan.email && (
                      <a
                        href={`mailto:${loan.email}?subject=${encodeURIComponent(
                          'Overdue library book'
                        )}&body=${encodeURIComponent(
                          `Hi ${loan.student}, "${loan.book}" was due on ${formatDate(
                            loan.dueDate
                          )}. Please return it to the library as soon as you can. Late fines apply for each day it is overdue.`
                        )}`}
                      >
                        Email reminder
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Most borrowed books</h2>
        <p className="panel-sub">Counted from every loan the library has recorded.</p>

        {popularData.length === 0 ? (
          <p className="status">No loans yet. This chart fills in after the first book is issued.</p>
        ) : (
          <div
            className="chart"
            role="img"
            aria-label={`Bar chart of the ${popularData.length} most borrowed books. The most borrowed is ${popularData[0].title} with ${popularData[0].borrowCount} loans.`}
          >
            <ResponsiveContainer width="100%" height={Math.max(220, popularData.length * 44)}>
              <BarChart
                data={popularData}
                layout="vertical"
                margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke={COLORS.line} />
                <XAxis type="number" allowDecimals={false} tick={AXIS_TEXT} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={170}
                  tick={{ fill: COLORS.text, fontSize: 13 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(23, 63, 53, 0.06)' }}
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
                  formatter={(value) => [`${value} ${value === 1 ? 'loan' : 'loans'}`, 'Borrowed']}
                />
                <Bar
                  dataKey="borrowCount"
                  fill={COLORS.primary}
                  radius={[0, 2, 2, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="borrowCount" position="right" fill={COLORS.text} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Books issued in the last 14 days</h2>
        <p className="panel-sub">{issuedTotal} {issuedTotal === 1 ? 'book was' : 'books were'} issued over this period.</p>

        {issuedTotal === 0 ? (
          <p className="status">No books have been issued in the last 14 days.</p>
        ) : (
          <div
            className="chart"
            role="img"
            aria-label={`Area chart of books issued per day over the last 14 days. ${issuedTotal} books were issued in total.`}
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={activityData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.line} />
                <XAxis dataKey="label" tick={AXIS_TEXT} interval="preserveStartEnd" minTickGap={16} />
                <YAxis allowDecimals={false} tick={AXIS_TEXT} width={32} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} ${value === 1 ? 'book' : 'books'}`, 'Issued']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  fill={COLORS.secondary}
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;