const express = require("express");

const authRoutes = require("./auth.routes");
const meRoutes = require("./me.routes");
const postsRoutes = require("./posts.routes");
const communitiesRoutes = require("./communities.routes");
const helpRequestsRoutes = require("./helpRequests.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/me", meRoutes);
router.use("/posts", postsRoutes);
router.use("/communities", communitiesRoutes);
router.use("/help-requests", helpRequestsRoutes);
router.use("/admin", adminRoutes);

module.exports = router;