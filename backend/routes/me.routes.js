const express = require("express");
const auth = require("../middleware/auth.middleware");
const meController = require("../controllers/me.controller");

const router = express.Router();

router.get("/", auth, meController.me);
router.patch("/contact", auth, meController.updateContact);

module.exports = router;