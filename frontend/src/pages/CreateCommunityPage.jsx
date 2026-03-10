import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCommunity,
  getCommunityById,
  listCommunityCategories,
  updateCommunity,
} from "../api/communities";
import "./createCommunity.css";

export default function CreateCommunityPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setPageLoading(true);
      setErr("");

      try {
        const [categoriesData, communityData] = await Promise.all([
          listCommunityCategories(),
          isEdit ? getCommunityById(id) : Promise.resolve(null),
        ]);

        setCategories(categoriesData);

        if (communityData) {
          setName(communityData.name || "");
          setDescription(communityData.description || "");
          setCategoryId(String(communityData.community_category_id || ""));
        }
      } catch (e) {
        setErr(e?.response?.data?.message || "Не удалось загрузить данные сообщества");
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !categoryId) {
      setErr("Заполните обязательные поля");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        community_category_id: Number(categoryId),
      };

      if (isEdit) {
        await updateCommunity(id, payload);
      } else {
        await createCommunity(payload);
      }

      nav("/communities");
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          (isEdit ? "Ошибка обновления сообщества" : "Ошибка создания сообщества")
      );
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <div className="hint">Загрузка...</div>;
  }

  return (
    <div className="createCommunityPage">
      <div className="createCommunityCard">
        <div className="createCommunityBack" onClick={() => nav("/communities")}>
          ← Назад к сообществам
        </div>

        <div className="createCommunityTitle">
          {isEdit ? "Редактирование сообщества" : "Создание сообщества"}
        </div>

        <div className="createCommunitySub">
          {isEdit
            ? "Измените данные существующего сообщества"
            : "Создайте новое тематическое сообщество для коллег"}
        </div>

        <form onSubmit={submit}>
          <label className="fieldLabel">Название сообщества *</label>

          <input
            className="fieldInput"
            placeholder="Например: IT-отдел"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="fieldLabel">Описание</label>

          <textarea
            className="fieldTextarea"
            placeholder="Кратко опишите тематику сообщества..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label className="fieldLabel">Категория *</label>

          <select
            className="fieldInput"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Выберите категорию</option>
            {categories.map((category) => (
              <option
                key={category.community_category_id}
                value={category.community_category_id}
              >
                {category.name}
              </option>
            ))}
          </select>

          {err && <div className="formError">{err}</div>}

          <div className="createCommunityButtons">
            <button className="createCommunitySubmit" disabled={loading}>
              {loading
                ? isEdit
                  ? "Сохранение..."
                  : "Создание..."
                : isEdit
                ? "Сохранить изменения"
                : "Создать сообщество"}
            </button>

            <button
              type="button"
              className="createCommunityCancel"
              onClick={() => nav("/communities")}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}