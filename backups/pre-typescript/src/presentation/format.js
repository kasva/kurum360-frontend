export const dateText = value => value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('tr-TR') : '—';
export const dateTime = value => new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
export const numberText = value => value.toLocaleString('tr-TR');
