const express = require("express");
const auth = require("../middleware/auth.middleware");
const helpRequestsController = require("../controllers/helpRequests.controller");

const router = express.Router();

router.get("/", auth, helpRequestsController.list);
router.get("/my", auth, helpRequestsController.myRequests);
router.get("/responses/my", auth, helpRequestsController.myResponses);

router.post("/", auth, helpRequestsController.create);

router.get("/:id", auth, helpRequestsController.getById);
router.patch("/:id", auth, helpRequestsController.update);
router.delete("/:id", auth, helpRequestsController.remove);

router.post("/:id/respond", auth, helpRequestsController.respond);
router.delete("/:id/respond", auth, helpRequestsController.cancelResponse);

router.post(
  "/:id/responses/:responseId/confirm",
  auth,
  helpRequestsController.confirmResponse
);

module.exports = router;