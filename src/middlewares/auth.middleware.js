import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req , res , next) => {
    try {
        const token = req.cookies?.accessToken || 
                        req.header("Authorization")?.replace("bearer ", "")

        if(!token){
            throw new ApiError(401, "Unauthorised User")
        }                     
        
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
        console.log(`\n decoded Token ${decodedToken}`);
        

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken" )
        if(!user){
            throw new ApiError(401 , "Invalid access token")
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(404 , error?.message || "Invalid access Token")
        
    }     
})