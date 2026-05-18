import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import * as userRepository from "../repositories/user.repository.js";
import jwt from "jsonwebtoken"

const registerUser = asyncHandler(async(req ,res)=>{
    // get user details(username ,email , fullName , password) from req.body
    // verify is it present or not
    // check if it(username OR email) is already present in DB
    // if avatar is present then upload it to cloudinary using multer middleware
    // create user object in DB
    // remove refreshToken and password field
    // check for user creation 
    // return user


    const {username , fullName , email , password} = req.body

    if([fullName , username , email , password].some((field) => field?.trim()==="")){
        throw new ApiError(400 , "All fields are required")
    }

    const existedUser = await User.findOne({
        $or : [
            {email},
            {username}
        ]
    })

    if(existedUser){
        throw new ApiError(409 , "User already exists with same email or username")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let avatar = null;
    if(avatarLocalPath){
        avatar = await uploadOnCloudinary(avatarLocalPath);

        if(!avatar){
            throw new ApiError(500 , "Avatar file is missing")
        }
    }

    const user = await User.create({
        email,
        username : username.toLowerCase(),
        fullName ,
        password,
        avatar : {
            url : avatar?.secure_url || "",
            public_id : avatar?.public_id || ""
        },

    })

    const createdUser = await User.findById(user?._id).select("-password -refreshToken")
    console.log(createdUser);
    
    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200 , createdUser , "user created successfully")
    )

});

const generateAccessAndRefreshToken = async(userId)=> {
    try{
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken

        await user.save({validateBeforeSave : false})

        return { accessToken , refreshToken}

    
    } catch (error) {
        throw new ApiError(409 , error?.message || "something went wrong for token generation")
    }
};

const loginUser = asyncHandler(async(req , res)=> {
    // get user details(email , username , password) from req.body
    // check if user exist with same email or username
    // compare password with that user compare function defined in schema
    // create access and refresh token
    // assign accessToken to user and refresh token to DB
    // send cookies 

    const {email , username , password} = req.body

    console.log(email)
    console.log(username)

    if(!email && !username){
        throw new ApiError(400 , "email or username is required")
    }

    const user = await User.findOne({
        $or:[{email},{username}]
    }).select("+password")

    console.log(user);
    
    if(!user){
        throw new ApiError(401 , "No user exists ")
    }

    const isValidPassword = await user.isPasswordCorrect(password)

    if(!isValidPassword){
        throw new ApiError(400 , "Password is incorrect!!")
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)

    const options ={
        httpOnly : true,
        secure : true
    }


    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200 , 
            loggedInUser,
            "User logged in successfully"
        )
    )
});

const logoutUser = asyncHandler(async(req , res)=>{
    // get user from req
    //  unset its refreshToken
    // clear cokkie
    console.log(req);
    console.log(req.user);
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset:{
                refreshToken: 1
                // completely delete a field (key and value)
            }
        },
        {
            new : true
        }
    )

    const options= {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200 , {},"User logged Out Successfully!!"
        )
    )
});

const refreshAccessToken = asyncHandler(async(req , res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request: No refresh token provided")
    }

    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken , 
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id).select("+refreshToken");
        if(!user){
            throw new ApiError(400 , "invalid refersh Token")
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(400 , "refersh token is expired or used")
        }

        const {accessToken , refreshToken} = generateAccessAndRefreshToken(user._id)

        const options={
                httpOnly: true,
                secure: true
        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken, options)
        .json(
            new ApiResponse(
                200 , {accessToken,refreshToken} , "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(400 , error?.message||"error while refreshing the access token")
        
    }


});

const getUserProfile = asyncHandler(async (req, res) => {
   
    const {username} = req.params;
    console.log(username)

    if(!username || username.trim() === ""){
        throw new ApiError(409 , "username is missing")
    }

    const user = await User.findOne({username})
    const userId = user?._id
    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    
    const baseUser = await userRepository.getUserDetails(userId)
    const finalStats = await userRepository.getUserGameStats(userId)

   
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    profile: baseUser,
                    stats: finalStats // Isme totalGamesPlayed, totalWins, aur totalScore hoga
                },
                "User profile and quiz stats fetched successfully"
            )
        );
});

const updateUserProfile = asyncHandler(async(req , res)=>{
    const {email , username , fullName , avatar} = req.body

    const userId = req.user?._id

    const updatedFields = {}

    if(fullName && fullName.trim !== ""){
        updatedFields.fullName = fullName.trim()
    }

    if (username && username.trim() !== "") {
        const cleanedUsername = username.trim().toLowerCase();
        
        // Security: Prevent username conflicts
        const usernameExists = await User.findOne({ username: cleanedUsername, _id: { $ne: userId } });
        if (usernameExists) throw new ApiError(409, "Username is already taken");
        
        updatedFields.username = cleanedUsername;
    }

    if (email && email.trim() !== "") {
        const cleanedEmail = email.trim().toLowerCase();
        
        // Security: Prevent email conflicts
        const emailExists = await User.findOne({ email: cleanedEmail, _id: { $ne: userId } });
        if (emailExists) throw new ApiError(409, "Email is already in use by another account");
        
        updatedFields.email = cleanedEmail;
    }

    const newAvatarLocalPath = req.file?.path || req.files?.avatar?.[0]?.path

    if(newAvatarLocalPath){
        const currentUser = await User.findById(userId);
        
        const uploadedAvatar = await uploadOnCloudinary(newAvatarLocalPath);
        if (!uploadedAvatar) throw new ApiError(500, "Failed to upload avatar");

        // Clear old asset from cloud
        if (currentUser?.avatar?.public_id) {
            await deleteFromCloudinary(currentUser.avatar.public_id);
        }

        updatedFields["avatar.url"] = uploadedAvatar.secure_url;
        updatedFields["avatar.public_id"] = uploadedAvatar.public_id;
    }

    if (Object.keys(updatedFields).length === 0) {
        throw new ApiError(400, "No fields provided to update");
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updatedFields },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");


     return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

const changeCurrentPassword = asyncHandler(async (req , res) => {
    // old password , new password -> req.body
    // user logged in status from req.user (auth middleware)
    // check if old password are same as stored in db 
    // check if new password are not same with old password 
    // change old password with new one in db


    const { oldPassword , newPassword } = req.body

    const user = await User.findById(req.user?._id).select("+password")

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if( !isPasswordCorrect ) {
        throw new ApiError(401 , "old password is wrong")
    }


    const isSameAsOld = await user.isPasswordCorrect(newPassword);
    if (isSameAsOld) {
        throw new ApiError(400, "New password cannot be the same as your current password");
    }

    if (newPassword.trim().length < 8) {
        throw new ApiError(400, "New password must be at least 8 characters long");
    }

    user.password = newPassword

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password Changed successfully"
        )
    )
});

const deleteAccount = asyncHandler(async (req, res) => {

    const {password}  = req.body;
    const userId = req.user?._id;

    if (!password) {
        throw new ApiError(400, "Password is required to delete your account");
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
        throw new ApiError(404, "User session not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password. Account deletion aborted.");
    }

    if (user.avatar?.public_id) {
        await deleteFromCloudinary(user.avatar.public_id);
    }

    await User.findByIdAndDelete(userId);

    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(
                200, 
                {}, 
                "Your account and associated profile assets have been permanently deleted"
            )
        );
});


export {
    registerUser,
    generateAccessAndRefreshToken,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserProfile,
    updateUserProfile,
    changeCurrentPassword,
    deleteAccount
}