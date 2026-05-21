import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUserGameHistory, getMatchReport } from "../controllers/gameResult.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/history").get(getUserGameHistory);
router.route("/report/:gameResultId").get(getMatchReport);

export default router;
