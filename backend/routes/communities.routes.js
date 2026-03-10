const express = require("express");
const auth = require("../middleware/auth.middleware");
const communitiesController = require("../controllers/communities.controller");

const router = express.Router();

// ВАЖНО: сначала статические маршруты
router.get("/categories", auth, communitiesController.categories);
router.get("/my", auth, communitiesController.mySubscriptions);

// Базовые операции
router.get("/", auth, communitiesController.list);
router.post("/", auth, communitiesController.create);

// Маршруты по id
router.get("/:id", auth, communitiesController.getById);
router.patch("/:id", auth, communitiesController.update);
router.delete("/:id", auth, communitiesController.remove);

// Подписки
router.post("/:id/subscribe", auth, communitiesController.subscribe);
router.delete("/:id/subscribe", auth, communitiesController.unsubscribe);

// Посты сообщества
router.get("/:id/posts", auth, communitiesController.posts);

module.exports = router;