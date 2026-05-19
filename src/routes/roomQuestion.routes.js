import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { setupRoomQuestions } from "../controllers/roomQuestion.controller.js";

const router = Router();
router.route("/setup").post(verifyJWT, setupRoomQuestions);

export default router;
