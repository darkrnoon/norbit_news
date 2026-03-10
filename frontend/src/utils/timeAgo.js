export function timeAgoRu(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return "только что";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const minutes = Math.floor(diffMs / minute);
  const hours = Math.floor(diffMs / hour);
  const days = Math.floor(diffMs / day);

  // до суток: минуты/часы
  if (diffMs < day) {
    if (minutes < 1) return "только что";
    if (minutes < 60) return pluralRu(minutes, "минуту", "минуты", "минут") + " назад";
    return pluralRu(hours, "час", "часа", "часов") + " назад";
  }

  // до 6 дней включительно: дни
  if (days <= 6) {
    return pluralRu(days, "день", "дня", "дней") + " назад";
  }

  // недели до месяца (~4 недели)
  const weeks = Math.floor(days / 7);
  if (days < 30) {
    return pluralRu(weeks, "неделю", "недели", "недель") + " назад";
  }

  // месяцы до 6 месяцев
  const months = Math.floor(days / 30);
  if (months <= 6) {
    return pluralRu(months, "месяц", "месяца", "месяцев") + " назад";
  }

  // больше 6 месяцев: дата без времени
  return date.toLocaleDateString("ru-RU");
}

function pluralRu(n, one, few, many) {
  // 1, 21, 31...
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}