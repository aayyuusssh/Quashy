import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createQuestion, bulkUploadQuestions , getAllQuestions , getRandomQuestionsForGame} from "../controllers/question.controller.js";

const router = Router();
router.use(verifyJWT); // Secure both endpoints

router.route("/create").post(createQuestion);
router.route("/bulk-upload").post(bulkUploadQuestions);
router.route("/all").get(getAllQuestions);
router.route("/random").get(getRandomQuestionsForGame);

export default router;
