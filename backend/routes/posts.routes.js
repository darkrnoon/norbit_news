const express = require("express");
const auth = require("../middleware/auth.middleware");
const postsController = require("../controllers/posts.controller");

const router = express.Router();

// feed
router.get("/feed", auth, postsController.getFeed);
router.get("/feed/communities", auth, postsController.getMyCommunitiesFeed);

// CRUD
router.post("/", auth, postsController.create);
router.get("/:id", auth, postsController.getById);
router.patch("/:id", auth, postsController.update);
router.delete("/:id", auth, postsController.remove);

// pin/unpin
router.post("/:id/pin", auth, postsController.pin);
router.delete("/:id/pin", auth, postsController.unpin);

module.exports = router;