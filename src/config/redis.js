import { createClient } from "redis";

// 1. Initialize the main read/write connection engine instance.
// It will look for REDIS_URL in your .env, or fallback to your local computer's default RAM pipeline.
const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
});

// 2. Clone the main client to create an isolated, dedicated Subscriber tunnel.
// Socket.io requires a clean, unblocked duplicate connection to handle cross-server room syncing.
const redisSubscriber = redisClient.duplicate();

// 3. Central System Error Catchers
// If your local Redis server crashes or stops running, these listeners keep your app from completely dying.
redisClient.on("error", (err) => console.error("Redis Main Client Error:", err));
redisSubscriber.on("error", (err) => console.error(" Redis Sub Client Error:", err));

/**
 * Async Bootstrapper to fire up the RAM connections before the server starts accepting network requests.
 */
export const connectRedis = async () => {
    try {
        // Only trigger connection if the socket pipes aren't already active
        if (!redisClient.isOpen) {
            await redisClient.connect();     // Open Main Channel
            await redisSubscriber.connect();  // Open Sync Channel
            console.log(" Redis Client Connected successfully in memory.");
        }
    } catch (error) {
        console.error("Critical Redis memory layer connection failure:", error.message);
        throw error; 
    }
};

export { redisClient, redisSubscriber };
