import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createQuestion, bulkUploadQuestions , getAllQuestions , getRandomQuestionsForGame} from "../controllers/question.controller.js";
import { contentCreationLimiter ,bulkUploadLimiter } from "../middlewares/rateLimiter.middleware.js"; 

const router = Router();
router.use(verifyJWT); // Secure both endpoints

router.route("/create").post(contentCreationLimiter,createQuestion);
router.route("/bulk-upload").post(bulkUploadLimiter,bulkUploadQuestions);
router.route("/all").get(getAllQuestions);
router.route("/random").get(getRandomQuestionsForGame);

export default router;
