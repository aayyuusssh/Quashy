import mongoose from "mongoose";
import { DB_Name } from "../constants/dbName.js";

const ConnectDB = async()=> {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`)
        console.log(`\n Mongo DataBase Connected !! DB HOST : ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log(`DB Connection error : ${error}`)
        process.exit(1)
        
    }
    
}

export default ConnectDB