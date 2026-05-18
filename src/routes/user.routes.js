import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { changeCurrentPassword, deleteAccount, getUserProfile, loginUser, logoutUser, refreshAccessToken, registerUser, updateUserProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.single("avatar"),
    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT , logoutUser)
router.route("/refresh-access-token").post(refreshAccessToken)

router.route("/c/:username").get(verifyJWT,getUserProfile)
router.route("/update-user-profile").patch(verifyJWT,  upload.single("avatar"), updateUserProfile)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/delete-account").delete(verifyJWT,deleteAccount)



export default router;