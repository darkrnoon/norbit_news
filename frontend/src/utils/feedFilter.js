export function filterPostsClient(posts, { period, query, hiddenAuthors }) {
  let res = posts;

  // скрыть авторов (по user_id)
  if (hiddenAuthors?.length) {
    const hiddenSet = new Set(hiddenAuthors.map(String));
    res = res.filter((p) => !hiddenSet.has(String(p.author_user_id)));
  }

  // поиск
  const q = (query || "").trim().toLowerCase();
  if (q) {
    res = res.filter((p) => {
      const t = (p.title || "").toLowerCase();
      const c = (p.content || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }

  // период
  if (period && period !== "all") {
    const now = new Date();
    let from = null;

    if (period === "today") {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      from = new Date(now);
      from.setMonth(now.getMonth() - 1);
    }

    if (from) {
      res = res.filter((p) => new Date(p.published_at) >= from);
    }
  }

  return res;
}