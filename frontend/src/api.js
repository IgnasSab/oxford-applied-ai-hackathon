export async function api(path, method = 'GET', body) {
  const multipart = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    ...(body === undefined ? {} : {
      headers: multipart ? {} : { 'Content-Type': 'application/json' },
      body: multipart ? body : JSON.stringify(body),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = Array.isArray(data.detail)
      ? data.detail.map((item) => `${item.loc.slice(1).join(' ')}: ${item.msg}`).join('; ')
      : data.detail;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

export const money = (value) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
export const dateLabel = (value) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' });
export const timeLabel = (value) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
export const formatLabel = (mode) => mode === 'online' ? 'Online' : 'In person';
export const scoreStudy = (study, weights) => Object.entries(weights).reduce((total, [key, weight]) => total + study.components[key] * weight, 0) / Object.values(weights).reduce((total, value) => total + value, 0);

export function conflicts(slot, duration, bookings) {
  const starts = new Date(slot.starts_at).getTime();
  return bookings.some((booking) => starts < new Date(booking.starts_at).getTime() + booking.duration * 60000 && starts + duration * 60000 > new Date(booking.starts_at).getTime());
}
