const express = require("express");

const auth = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

router.use(
  auth,
  roleMiddleware("Администратор", "Системный администратор")
);

// Статистика
router.get("/stats", adminController.stats);

// Новости
router.get("/posts", adminController.listPosts);
router.get("/posts/:id", adminController.getPostById);
router.delete("/posts/:id", adminController.deletePost);

// Комментарии к новости
router.get("/posts/:id/comments", adminController.getPostComments);
router.delete(
  "/posts/:postId/comments/:commentId",
  adminController.deleteComment
);

// Сообщества
router.get("/communities", adminController.listCommunities);
router.get("/communities/:id", adminController.getCommunityById);
router.delete("/communities/:id", adminController.deleteCommunity);

// Запросы помощи
router.get("/help-requests", adminController.listHelpRequests);
router.get("/help-requests/:id", adminController.getHelpRequestById);
router.delete("/help-requests/:id", adminController.deleteHelpRequest);

module.exports = router;