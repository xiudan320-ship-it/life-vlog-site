export function getNextWeekendDate(reference = new Date()) {
  const date = new Date(reference);
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}
