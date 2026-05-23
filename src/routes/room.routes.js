import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    createRoom, 
    joinRoom, 
    abortRoom, 
    getRoomDetails, 
    getActiveRooms 
} from "../controllers/room.controller.js";
import { strictAuthLimiter } from "../middlewares/rateLimiter.middleware.js"; 

const router = Router();

// Allows anyone to browse available games  
router.route("/active").get(getActiveRooms);
router.route("/info/:roomCode").get(getRoomDetails);


// secured routes(login chahiyee)
router.use(verifyJWT); 

router.route("/create").post(strictAuthLimiter,createRoom);
router.route("/join").post(joinRoom);
router.route("/abort").delete(abortRoom);

export default router;
