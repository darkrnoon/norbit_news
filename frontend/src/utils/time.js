function pluralRu(number, one, few, many) {
  const mod10 = number % 10;
  const mod100 = number % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;

  return many;
}

export function formatPostDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "только что";

  if (diffMinutes < 60) {
    return `${diffMinutes} ${pluralRu(diffMinutes, "минута", "минуты", "минут")} назад`;
  }

  if (diffHours < 24) {
    return `${diffHours} ${pluralRu(diffHours, "час", "часа", "часов")} назад`;
  }

  if (diffDays < 7) {
    return `${diffDays} ${pluralRu(diffDays, "день", "дня", "дней")} назад`;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}