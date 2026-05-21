import { Room } from "../../models/room.model.js";
import { User } from "../../models/user.model.js";
import { 
    addPlayerToRedisLobby, 
    getRedisLobbyCount, 
    getRedisLobbyPlayers 
} from "../../runtime/roomStore.js";

/**
 * Handles a user physically entering a live quiz lobby via WebSockets.
 * @param {Object} io - The main global Socket.io instance
 * @param {Object} socket - The individual player's open network pipe
 */
export const handleJoinLobby = (io, socket) => {
    // We register an active message event listener on this player's specific socket pipe
    socket.on("join-lobby", async (payload) => {
        try {
            const { roomCode, userId } = payload;

            // 1. INPUT DATA SANITIZATION
            if (!roomCode || !userId) {
                return socket.emit("join-error", { message: "Invalid payload: roomCode and userId are required" });
            }

            const cleanCode = roomCode.toUpperCase().trim();

            // 2. RULES ENGINE CHECK (MongoDB)
            // Look up the room rules matrix from the persistent disk database
            const roomConfig = await Room.findOne({ roomCode: cleanCode, status: "waiting" });
            if (!roomConfig) {
                return socket.emit("join-error", { message: "Lobby not found, closed, or game already active" });
            }

            // 3. ATOMIC CAPACITY FILTERING (Redis)
            // Fetch the exact number of players currently sitting in this memory set channel
            const currentPlayersCount = await getRedisLobbyCount(cleanCode);

            // Block entry if the high-speed counter has touched or breached the host's limit
            if (currentPlayersCount >= roomConfig.maxPlayers) {
                return socket.emit("room-full", { message: "This game room has hit maximum player capacity" });
            }

            // 4. MEMORY STATE COMMIT
            // Add the player's User ID to our ultra-fast Redis Set
            await addPlayerToRedisLobby(cleanCode, userId);

            // 5. PIPE BINDING
            // Instruct Socket.io to physically subscribe this individual user's socket connection 
            // into a scoped network chat room channel matching the 6-digit code.
            socket.join(cleanCode);
            
            // Temporarily store the metadata parameters directly inside this socket's server context
            // This is crucial! It allows the disconnect handler to know which room to remove them from later.
            socket.roomCode = cleanCode;
            socket.userId = userId;

            // 6. REAL-TIME SYNCHRONIZATION DATA HYDRATION
            // Fetch the entire active array list of User IDs from our Redis set
            const activePlayerIds = await getRedisLobbyPlayers(cleanCode);

            // Fetch the corresponding display names/avatars from MongoDB so React can render pretty cards
            const hydratedPlayersList = await User.find({ _id: { $in: activePlayerIds } })
                .select("username avatar");

            // BROADCAST: Send the complete fresh players collection out to EVERY user sitting inside 
            // this room stream pipeline. Everyone's screen will update automatically at the same millisecond!
            io.to(cleanCode).emit("player-list-updated", {
                players: hydratedPlayersList,
                roomTitle: roomConfig.title
            });

            console.log(` Player [${userId}] successfully routed into Redis Room channel: ${cleanCode}`);

        } catch (error) {
            console.error("Error handling join-lobby event:", error.message);
            socket.emit("join-error", { message: "Internal server anomaly while entering lobby" });
        }
    });
};
