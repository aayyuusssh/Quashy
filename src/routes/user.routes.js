import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { changeCurrentPassword, verifyOTP,deleteAccount, getUserProfile, loginUser, logoutUser, refreshAccessToken, registerUser, updateUserProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { strictAuthLimiter } from "../middlewares/rateLimiter.middleware.js"; 

const router = Router()

router.route("/register").post(
    strictAuthLimiter,
    upload.single("avatar"),
    registerUser
)
router.route("/verify-otp").post(strictAuthLimiter, verifyOTP);

router.route("/login").post(strictAuthLimiter,loginUser)

router.route("/logout").post(verifyJWT , logoutUser)
router.route("/refresh-access-token").post(refreshAccessToken)

router.route("/c/:username").get(verifyJWT,getUserProfile)
router.route("/update-user-profile").patch(verifyJWT, strictAuthLimiter, upload.single("avatar"), updateUserProfile)
router.route("/change-password").post(verifyJWT, strictAuthLimiter,changeCurrentPassword)
router.route("/delete-account").delete(verifyJWT,deleteAccount)



export default router;