const express = require("express");
const auth = require("../middleware/auth.middleware");
const communitiesController = require("../controllers/communities.controller");
const { uploadCommunityAvatar } = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/categories", auth, communitiesController.categories);
router.get("/my", auth, communitiesController.mySubscriptions);

router.get("/", auth, communitiesController.list);

router.post(
  "/",
  auth,
  uploadCommunityAvatar.single("avatar"),
  communitiesController.create
);

router.get("/:id/posts", auth, communitiesController.posts);

router.get("/:id", auth, communitiesController.getById);

router.patch(
  "/:id",
  auth,
  uploadCommunityAvatar.single("avatar"),
  communitiesController.update
);

router.delete("/:id", auth, communitiesController.remove);

router.post("/:id/subscribe", auth, communitiesController.subscribe);
router.delete("/:id/subscribe", auth, communitiesController.unsubscribe);

module.exports = router;