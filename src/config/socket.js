import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter"; // 1. Import the multi-server clustering adapter
import { redisClient, redisSubscriber } from "./redis.js";

let io = null;

export const initSocketServer = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Postman aur local testing ke liye sab allowed hai
            // credentials: true // 👈 Temporarily isko comment kardo kyunki '*' ke sath ye crash karta hai!
        }
    });

    // ENTERPRISE INTEGRATION GATEWAY: Attach Socket.io directly to your Redis memory layers.
    // The main client publishes outgoing events, while the subscriber listens for incoming state changes.
    io.adapter(createAdapter(redisClient, redisSubscriber));

    console.log("Socket.io Server successfully bound to Redis memory adapter layer.");
    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io has not been initialized!");
    return io;
};
