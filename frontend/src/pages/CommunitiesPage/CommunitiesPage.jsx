import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";

import {
  getCommunityCategories,
  getMyCommunities,
  listCommunities,
} from "../../api/communities.api";

import CommunityCard from "../../components/CommunityCard/CommunityCard";

import "./CommunitiesPage.css";

const TABS = {
  ALL: "all",
  MY: "my",
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCommunity(community) {
  return {
    ...community,
    isSubscribed: Boolean(
      community.isSubscribed ?? community.is_subscribed
    ),
  };
}

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get("tab") === "my" ? TABS.MY : TABS.ALL;

  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
        setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

  const [communities, setCommunities] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      const data = await getCommunityCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }

  async function loadCommunities(tab = activeTab) {
    try {
      setIsLoading(true);
      setError("");

      if (tab === TABS.MY) {
        const data = await getMyCommunities();

        setCommunities(
            data.map((community) =>
                normalizeCommunity({
                ...community,
                isSubscribed: true,
                })
            )
            );

        return;
      }

      const data = await listCommunities();

      setCommunities(data.map(normalizeCommunity));
    } catch (e) {
      setError(
        e?.response?.data?.message || "Не удалось загрузить сообщества"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadCommunities(activeTab);
  }, [activeTab]);

  function handleTabChange(tab) {
    setActiveTab(tab);

    if (tab === TABS.MY) {
        setSearchParams({ tab: "my" });
    } else {
        setSearchParams({});
    }
    }

  function handleToggleCategory(categoryId) {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }

      return [...prev, categoryId];
    });
  }

  const filteredCommunities = useMemo(() => {
    const query = normalizeText(search);

    return communities.filter((community) => {
      const matchesSearch =
        !query ||
        normalizeText(community.name).includes(query) ||
        normalizeText(community.description).includes(query);

      const matchesCategory =
        selectedCategoryIds.length === 0 ||
        selectedCategoryIds.includes(Number(community.community_category_id));

      return matchesSearch && matchesCategory;
    });
  }, [communities, search, selectedCategoryIds]);

  return (
    <div className="communities-page">
      <aside className="communities-categories">
        <h2 className="communities-categories__title">Категории</h2>

        <div className="communities-categories__list">
          {categories.map((category) => (
            <label
              className="communities-categories__item"
              key={category.community_category_id}
            >
              <input
                type="checkbox"
                checked={selectedCategoryIds.includes(
                  category.community_category_id
                )}
                onChange={() =>
                  handleToggleCategory(category.community_category_id)
                }
              />

              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </aside>

      <section className="communities-content">
        <div className="communities-header">
          <div>
            <h1 className="communities-header__title">Сообщества</h1>
            <p className="communities-header__subtitle">
              Присоединяйтесь к тематическим сообществам
            </p>
          </div>

          <button
            className="communities-header__create"
            type="button"
            onClick={() => navigate("/communities/new")}
          >
            <img src="/assets/plus.svg" alt="" />
            <span>Создать сообщество</span>
          </button>
        </div>

        <div className="communities-tabs">
          <button
            className={`communities-tabs__button ${
              activeTab === TABS.ALL ? "is-active" : ""
            }`}
            type="button"
            onClick={() => handleTabChange(TABS.ALL)}
          >
            Все сообщества
          </button>

          <button
            className={`communities-tabs__button ${
              activeTab === TABS.MY ? "is-active" : ""
            }`}
            type="button"
            onClick={() => handleTabChange(TABS.MY)}
          >
            Подписки
          </button>
        </div>

        <div className="communities-search">
          <img src="/assets/search.svg" alt="" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск сообществ..."
          />
        </div>

        {isLoading && (
          <div className="communities-state">Загрузка...</div>
        )}

        {error && <div className="communities-error">{error}</div>}

        {!isLoading && !error && filteredCommunities.length === 0 && (
          <div className="communities-state">Сообщества не найдены</div>
        )}

        {!isLoading && !error && filteredCommunities.length > 0 && (
          <div className="communities-grid">
            {filteredCommunities.map((community) => (
              <CommunityCard
                key={community.community_id}
                community={community}
                user={user}
                onChanged={() => loadCommunities(activeTab)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}