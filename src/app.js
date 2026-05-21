import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended : true , limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


import userRouter from "../src/routes/user.routes.js"
import roomRouter from "./routes/room.routes.js";
import questionRouter from "../src/routes/question.routes.js";
import roomQuestionRouter from "../src/routes/roomQuestion.routes.js";
import gameResultRouter from "../src/routes/gameResult.routes.js";



app.use("/api/v1/users",userRouter)
app.use("/api/v1/rooms",roomRouter)
app.use("/api/v1/questions", questionRouter);
app.use("/api/v1/room-questions", roomQuestionRouter);
app.use("/api/v1/game-results", gameResultRouter);


app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500
    const message = err.message || "Something went wrong. Please try again."

    return res.status(statusCode).json({
        statusCode,
        data: null,
        message,
        success: false
    })
})


export {app}