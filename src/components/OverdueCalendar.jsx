const WEEKS = 5;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dayKey = (date) => date.toLocaleDateString('en-CA');

function OverdueCalendar({ records }) {
  const counts = {};
  records.forEach((record) => {
    const key = dayKey(new Date(record.dueDate));
    counts[key] = (counts[key] || 0) + 1;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7);

  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dayKey(date);

    cells.push({
      key,
      date,
      count: counts[key] || 0,
      isFuture: date > today,
      isToday: date.getTime() === today.getTime()
    });
  }

  const startKey = cells[0].key;
  const older = Object.keys(counts)
    .filter((key) => key < startKey)
    .reduce((sum, key) => sum + counts[key], 0);

  const level = (count) => Math.min(count, 4);

  return (
    <div className="calendar">
      <p className="calendar-note">
        Each square is a day. The number shows how many loans due that day have not been returned.
      </p>

      <div className="calendar-grid" aria-hidden="true">
        {WEEKDAYS.map((name) => (
          <span key={name} className="weekday">{name}</span>
        ))}

        {cells.map((cell, index) => {
          const label =
            cell.date.getDate() === 1 || index === 0
              ? cell.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : cell.date.getDate();

          return (
            <div
              key={cell.key}
              className={`day heat-${level(cell.count)}${cell.isFuture ? ' future' : ''}${cell.isToday ? ' today' : ''}`}
            >
              <span className="day-num">{label}</span>
              {cell.count > 0 && <span className="day-count">{cell.count}</span>}
            </div>
          );
        })}
      </div>

      {older > 0 && (
        <p className="calendar-note">
          {older} more overdue {older === 1 ? 'loan was' : 'loans were'} due before this calendar starts. They are listed below.
        </p>
      )}
    </div>
  );
}

export default OverdueCalendar;