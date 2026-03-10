const express = require("express");
const authRoutes = require("./auth.routes");
const meRoutes = require("./me.routes");
const postsRoutes = require("./posts.routes");
const communitiesRoutes = require("./communities.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/me", meRoutes);
router.use("/posts", postsRoutes);
router.use("/communities", communitiesRoutes);

module.exports = router;