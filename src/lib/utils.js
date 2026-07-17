export function formatPrice(n) {
  return `${Number(n).toLocaleString('ru-RU')} ₽/мес`;
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} дн назад`;
  return new Date(ts).toLocaleDateString('ru-RU');
}

export function validateForm(form) {
  const errors = {};
  if (!form.city.trim()) errors.city = 'Укажите город';
  if (!form.price || Number(form.price) <= 0) errors.price = 'Укажите цену';
  if (form.area && Number(form.area) <= 0) errors.area = 'Площадь должна быть больше 0';
  return errors;
}
