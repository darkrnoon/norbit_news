const express = require("express");
const auth = require("../middleware/auth.middleware");
const postsController = require("../controllers/posts.controller");
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

router.post("/:id/pin", auth, postsController.pin);
router.delete("/:id/pin", auth, postsController.unpin);

module.exports = router;