import {v2 as cloudinary} from "cloudinary"
import { response } from "express";
import fs from "fs"
import { ApiError } from "./ApiError.js";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null

        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })


        // file has been successfully uploaded
        console.log("File has been uploaded to cloudinary", response.url);

        fs.unlinkSync(localFilePath)
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null        
    }
}

const deleteOnCloudinary = async(public_id , resource_type = "image")=>{
    try {
        if(!public_id) return null;

        const deleteFile = await cloudinary.uploader.destroy(public_id ,
            { resource_type : resource_type})

        if (deleteFile.result !== "ok") {
            throw new ApiError(400, "Cloudinary file not found");
        }

        return deleteFile;
        
    } catch (error) {
        throw new ApiError(500 , error?.message || "File could not be delete permanently")
        
    }
}

export { 
    uploadOnCloudinary,
    deleteOnCloudinary
}