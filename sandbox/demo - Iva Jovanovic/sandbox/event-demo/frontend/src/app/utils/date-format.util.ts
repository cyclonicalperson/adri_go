export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00`));
}

export function formatRegistrationDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value.replace(' ', 'T')));
}

export function isUpcomingEvent(value: string): boolean {
  const eventDate = new Date(`${value}T23:59:59`);
  return eventDate.getTime() >= Date.now();
}
