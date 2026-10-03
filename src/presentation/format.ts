export const dateText = (value: string | null | undefined) => value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('tr-TR') : '—';
export const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
export const numberText = (value: number) => value.toLocaleString('tr-TR');
