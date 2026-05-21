import { app } from "./app.js";
import ConnectDB from "./config/db.js";
import dotenv from "dotenv"
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import { initSocketServer } from "../src/config/socket.js";
import { registerSocketEvents } from "../src/socket/events.js";
import { connectRedis } from "../src/config/redis.js";

dotenv.config({
    path:"./.env"
})

// INDUSTRY PATTERN: Wrap your Express application instance inside a native HTTP server.
// This allows a single port (e.g., 8000) to safely split standard HTTP traffic and WebSockets traffic.
const server = http.createServer(app);




ConnectDB()
.then(async () => {

    // This connects your two Redis clients before initializing Socket traffic
    await connectRedis(); 

    // 3. Socket server ko initialize karna native server pass karke
    const io = initSocketServer(server);
    
    // 4. Events controller files ko bind karna
    registerSocketEvents(io);

    // 5. Port standard listener open karna
    server.listen(process.env.PORT || 5000, () => {
        console.log(`Unified Server is actively running on Port ${process.env.PORT || 5000}`);        
    });

    server.on("error", (error) => {
        console.log(`Server connection error: ${error}`); 
        throw error;  
    });
})
.catch((error) => {
    console.log(`Mongo DB connection failed: ${error}`);
});

















// // Initialize Socket.io and attach it onto our newly wrapped HTTP server
// const io = new Server(server, {
//     cors: {
//         origin: process.env.CORS_ORIGIN || "http://localhost:5173", // Allows your local React server to talk to this socket server
//         credentials: true // Allows the socket stream to read your HTTP-Only login cookies
//     }
// });



// // This is the main messaging hub of your real-time application.
// // Whenever a browser tab opens your quiz app and connects, this event executes automatically.
// io.on("connection", (socket) => {
//     // 'socket' represents the individual persistent pipe belonging to that specific connected user
//     console.log(` A new player connected to real-time stream! Socket ID: ${socket.id}`);

//     // This is an event listener. We listen for a specific message name from the frontend.
//     socket.on("ping-test", (data) => {
//         console.log(" Received data from client:", data);
        
//         // This is a dynamic push emitter. The server sends data BACK to that specific user instantly.
//         socket.emit("pong-test", { message: "Hello from the backend real-time stream!" });
//     });

//     // Automatically catches when a user closes their browser tab or loses internet
//     socket.on("disconnect", () => {
//         console.log(` Player disconnected. Socket ID closed: ${socket.id}`);
//     });
// });





// ConnectDB()
// .then(()=>{
//     server.listen(process.env.PORT || 8000 , ()=>{
//         console.log(`Unified server is running on Port ${process.env.PORT || 8000}`);        
//     })

//     server.on("error", (error)=>{
//         console.log(`error : ${error}`); 
//         throw error  
//     })
// })
// .catch((error)=>{
//     console.log(`Mongo DB connection failed: ${error}`);
    
// })
