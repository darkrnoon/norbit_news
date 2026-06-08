const express = require("express");
const auth = require("../middleware/auth.middleware");
const meController = require("../controllers/me.controller");

const router = express.Router();

router.get("/", auth, meController.me);
router.get("/feed-filter-users", auth, meController.getFeedFilterUsers);

module.exports = router;