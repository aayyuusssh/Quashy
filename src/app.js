import express from "express"
import cors from "cors"

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

// app.use((err, req, res, next) => {
//     const statusCode = err.statusCode || err.status || 500
//     const message = err.message || "Something went wrong. Please try again."

//     return res.status(statusCode).json({
//         statusCode,
//         data: null,
//         message,
//         success: false
//     })
// })


export {app}