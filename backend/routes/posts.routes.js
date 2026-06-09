const express = require("express");
const auth = require("../middleware/auth.middleware");
const postsController = require("../controllers/posts.controller");
const likesController = require("../controllers/likes.controller");
const commentsController = require("../controllers/comments.controller");
const { uploadPostAttachments } = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/feed", auth, postsController.getFeed);
router.get("/feed/communities", auth, postsController.getMyCommunitiesFeed);

router.post(
  "/",
  auth,
  uploadPostAttachments.array("attachments", 4),
  postsController.create
);

router.get("/:id", auth, postsController.getById);

router.patch(
  "/:id",
  auth,
  uploadPostAttachments.array("attachments", 4),
  postsController.update
);

router.delete("/:id", auth, postsController.remove);

// Лайки
router.post("/:id/like", auth, likesController.like);
router.delete("/:id/like", auth, likesController.unlike);

// Комментарии
router.get("/:id/comments", auth, commentsController.getByPost);
router.post("/:id/comments", auth, commentsController.create);
router.delete(
  "/:postId/comments/:commentId",
  auth,
  commentsController.remove
);

// Закрепление
router.post("/:id/pin", auth, postsController.pin);
router.delete("/:id/pin", auth, postsController.unpin);

module.exports = router;