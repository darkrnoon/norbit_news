import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import {
  getHelpRequests,
  getMyHelpRequests,
  getMyHelpResponses,
} from "../../api/helpRequests.api";

import HelpRequestCard from "../../components/HelpRequestCard/HelpRequestCard";

import "./HelpRequestsPage.css";

const TABS = {
  ALL: "all",
  MY: "my",
  RESPONSES: "responses",
};

function getResponseStatus(item) {
  return (
    item?.status ||
    item?.response_status ||
    item?.my_response?.status ||
    item?.my_response?.response_status ||
    item?.myResponse?.status ||
    item?.myResponse?.response_status
  );
}

function isVisibleMyResponse(item) {
  const status = getResponseStatus(item);

  return status === "active" || status === "successful";
}

function normalizeResponseItem(item) {
  const request = item.help_request || item.help_requests || item.request;

  if (!request) {
    return item;
  }

  return {
    ...request,
    my_response: item,
  };
}

export default function HelpRequestsPage() {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [items, setItems] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const pageSubtitle = useMemo(() => {
    if (activeTab === TABS.MY) {
      return "Ваши созданные запросы";
    }

    if (activeTab === TABS.RESPONSES) {
      return "Запросы, на которые вы откликнулись";
    }

    return "Помогайте коллегам и зарабатывайте бусинки";
  }, [activeTab]);

  async function loadItems(tab = activeTab) {
    try {
      setIsLoading(true);
      setError("");

      if (tab === TABS.MY) {
        const data = await getMyHelpRequests();
        setItems(data);
        return;
      }

      if (tab === TABS.RESPONSES) {
        const data = await getMyHelpResponses();

        setItems(
          data
            .filter(isVisibleMyResponse)
            .map(normalizeResponseItem)
        );

        return;
      }

      const data = await getHelpRequests();
      setItems(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Не удалось загрузить запросы");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab]);

  return (
    <div className="help-requests-page">
      <div className="help-requests-header">
        <div>
          <h1 className="help-requests-header__title">Запросы помощи</h1>

          <p className="help-requests-header__subtitle">
            {pageSubtitle}
          </p>
        </div>

        <button
          className="help-requests-header__create"
          type="button"
          onClick={() => navigate("/help-requests/new")}
        >
          <img src="/assets/plus.svg" alt="" />
          <span>Создать запрос</span>
        </button>
      </div>

      <div className="help-requests-tabs">
        <button
          className={`help-requests-tabs__button ${
            activeTab === TABS.ALL ? "is-active" : ""
          }`}
          type="button"
          onClick={() => setActiveTab(TABS.ALL)}
        >
          Все запросы
        </button>

        <button
          className={`help-requests-tabs__button ${
            activeTab === TABS.MY ? "is-active" : ""
          }`}
          type="button"
          onClick={() => setActiveTab(TABS.MY)}
        >
          Мои запросы
        </button>

        <button
          className={`help-requests-tabs__button ${
            activeTab === TABS.RESPONSES ? "is-active" : ""
          }`}
          type="button"
          onClick={() => setActiveTab(TABS.RESPONSES)}
        >
          Мои отклики
        </button>
      </div>

      {isLoading && (
        <div className="help-requests-state">Загрузка...</div>
      )}

      {error && <div className="help-requests-error">{error}</div>}

      {!isLoading && !error && items.length === 0 && (
        <div className="help-requests-state">Запросы не найдены</div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="help-requests-list">
          {items.map((request) => (
            <HelpRequestCard
              key={
                request.help_request_id ||
                request.request_id ||
                request.id
              }
              request={request}
              user={user}
              activeTab={activeTab}
              onChanged={() => loadItems(activeTab)}
            />
          ))}
        </div>
      )}
    </div>
  );
}