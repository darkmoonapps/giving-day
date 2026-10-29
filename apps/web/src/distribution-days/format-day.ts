export function formatDistributionDate(date: string, language: string): string {
  const [yearText, monthText, dayText] = date.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return date;
  }

  return new Intl.DateTimeFormat(language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function formatDayHours(startTime: string, endTime: string): string {
  return `${toShortTime(startTime)} – ${toShortTime(endTime)}`;
}

function toShortTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function isUuid(value: string | undefined): value is string {
  if (value === undefined) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
