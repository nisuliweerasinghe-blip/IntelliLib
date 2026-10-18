const DAY = 24 * 60 * 60 * 1000;

export function dueStatus(dueDate) {
  const days = Math.ceil((new Date(dueDate) - Date.now()) / DAY);

  if (days < 0) {
    const late = -days;
    return { level: 'late', text: `Overdue by ${late} ${late === 1 ? 'day' : 'days'}` };
  }
  if (days === 0) {
    return { level: 'soon', text: 'Due today' };
  }
  if (days <= 3) {
    return { level: 'soon', text: `Due in ${days} ${days === 1 ? 'day' : 'days'}` };
  }
  return { level: 'ok', text: `Due in ${days} days` };
}