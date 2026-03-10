import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { createPost, getPostById, pinPost, unpinPost, updatePost } from "../api/posts";
import { getMyCommunities } from "../api/communities";
import "./postEditor.css";

function isPinned(post) {
  return post?.post_pins?.some((p) => p.is_active) || false;
}

export default function PostEditorPage() {
  const { me } = useOutletContext();
  const nav = useNavigate();
  const params = useParams();

  const postId = params.id ? Number(params.id) : null;
  const isEdit = Number.isFinite(postId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [myCommunities, setMyCommunities] = useState([]);
  const [communityId, setCommunityId] = useState(""); // string for <select>

  const [pin, setPin] = useState(false);

  // кто может закреплять (по твоим правилам на бэке)
  const canPin = useMemo(() => {
  const roleId = me?.role?.role_id;
  return roleId === 1 || roleId === 3 || roleId === 4; // ADMIN/DIRECTOR/SYSADMIN
}, [me]);

  useEffect(() => {
    // загружаем подписки для выпадашки
    (async () => {
      try {
        const list = await getMyCommunities();
        setMyCommunities(list);
      } catch {
        setMyCommunities([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const post = await getPostById(postId);

        setTitle(post.title || "");
        setContent(post.content || "");

        // если пост от сообщества — выставляем communityId
        setCommunityId(post.community_id ? String(post.community_id) : "");

        // текущее состояние pin
        setPin(isPinned(post));
      } catch (e) {
        setErr(e?.response?.data?.message || "Не удалось загрузить новость");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, postId]);

  const onCancel = () => nav(-1);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    setSaving(true);
    try {
      if (!isEdit) {
        // CREATE
        const payload = {
          title: title.trim(),
          content: content.trim(),
          is_community_post: Boolean(communityId),
          community_id: communityId ? Number(communityId) : null,
        };

        const created = await createPost(payload);

        // закрепление (если включено и разрешено)
        if (canPin && pin) {
          await pinPost(created.post_id);
        }

        nav("/", { replace: true });
      } else {
        // UPDATE
        await updatePost(postId, {
          title: title.trim() || null,
          content: content.trim() || null,
          is_community_post: Boolean(communityId),
          community_id: communityId ? Number(communityId) : null,
        });

        // управление закрепом
        if (canPin) {
          if (pin) await pinPost(postId);
          else await unpinPost(postId);
        }

        nav("/", { replace: true });
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editorPage">
      <div className="backRow">
        <Link className="backLink" to="/">
          ← Назад к ленте
        </Link>
      </div>

      <div className="editorCard">
        <h2 className="editorTitle">{isEdit ? "Редактирование новости" : "Создание новости"}</h2>
        <div className="editorSub">Поделитесь новостью или информацией с коллегами</div>

        {loading ? (
          <div className="hint">Загрузка...</div>
        ) : (
          <form onSubmit={onSubmit} className="form">
            <div className="field">
              <label className="label">Заголовок</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите заголовок новости..."
              />
            </div>

            <div className="field">
              <label className="label">Содержание</label>
              <textarea
                className="textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Расскажите подробнее..."
                rows={4}
              />
            </div>

            <div className="field">
              <label className="label">От лица сообщества (опционально)</label>
              <select
                className="select"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
              >
                <option value="">Выберите сообщество</option>
                {myCommunities.map((c) => (
                  <option key={c.community_id} value={c.community_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="muted">
                Можно выбрать только сообщества, на которые вы подписаны
              </div>
            </div>

            <div className="pinRow">
              <div>
                <div className="pinTitle">Закрепить новость</div>
                <div className="muted">Новость будет показываться вверху ленты</div>
              </div>

              <label className={"switch " + (!canPin ? "disabled" : "")}>
                <input
                  type="checkbox"
                  checked={pin}
                  onChange={(e) => setPin(e.target.checked)}
                  disabled={!canPin}
                />
                <span className="slider" />
              </label>
            </div>

            {err && <div className="errorBox">{err}</div>}

            <div className="actions">
              <button className="primary" type="submit" disabled={saving}>
                {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Опубликовать"}
              </button>
              <button className="secondary" type="button" onClick={onCancel} disabled={saving}>
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}   