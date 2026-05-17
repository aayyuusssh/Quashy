import { app } from "./app.js";
import ConnectDB from "./config/db.js";
import dotenv from "dotenv"
import mongoose from "mongoose";

dotenv.config({
    path:"./.env"
})


ConnectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`server is running on Port ${process.env.PORT}`);        
    })

    app.on("error", (error)=>{
        console.log(`error : ${error}`); 
        throw error  
    })
})
.catch((error)=>{
    console.log(`Mongo DB connection failed: ${error}`);
    
})
