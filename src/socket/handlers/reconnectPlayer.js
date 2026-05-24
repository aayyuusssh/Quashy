import { Room } from "../../models/room.model.js";
import { getRedisLiveLeaderboard } from "../../runtime/roomStore.js";
import { activeRoundStartTimeStamps } from "../../runtime/roomRuntime.js";

/**
 * Handles reconstructing state pipelines for users checking back into an active match after a network drop.
 */
export const handlePlayerReconnect = (io, socket) => {
    socket.on("reconnect-player", async (payload) => {
        try {
            // Securely grab the authenticated user details loaded by your socket middleware guard!
            const userId = socket.user?._id;
            const { roomCode } = payload;

            if (!roomCode || !userId) {
                return socket.emit("reconnect-error", { message: "Invalid parameters. Room code missing." });
            }

            const cleanCode = roomCode.toUpperCase().trim();

            // 1. LOOK UP SYSTEM ACTIVE LIFE RULES
            // Ensure the target room matches the code and is actively playing an ongoing game
            const activeRoom = await Room.findOne({ roomCode: cleanCode, status: "active" });
            if (!activeRoom) {
                return socket.emit("reconnect-error", { message: "Match session has concluded or room code is invalid." });
            }

            // 2. PIPE STRUCTURAL RE-BINDING
            // Re-subscribe this new socket container instance back into the scoped communication room channel
            socket.join(cleanCode);
            
            // Re-bind state memory metrics right on the fresh socket instance container context
            socket.roomCode = cleanCode;
            socket.userId = String(userId);

            // 3. RETRIEVE CACHED LEADERBOARD METRICS
            const rawZsetData = await getRedisLiveLeaderboard(cleanCode);
            
            // Extract the reconnecting user's personal active score profile out of the Redis Sorted Set
            let cachedScore = 0;
            const targetPlayer = rawZsetData.find(item => item.value === String(userId));
            if (targetPlayer) {
                cachedScore = targetPlayer.score;
            }

            // 4. SERVER TIMER SNAPSHOT RE-ALIGNMENT
            // Compute how many seconds are truly left on the server clock for the current round
            const roundStartTime = activeRoundStartTimeStamps[cleanCode];
            let calculatedRemainingSeconds = 0;

            if (roundStartTime) {
                // If a round is actively rolling, compute current delta time
                const elapsedSeconds = (Date.now() - roundStartTime) / 1000;
                // Fetch default round duration parameters (or fallback to general default metrics)
                const totalDuration = 30; // Alternatively pass dynamic rules if mapped to socket state
                calculatedRemainingSeconds = Math.max(0, Math.ceil(totalDuration - elapsedSeconds));
            }

            // 5. DISPATCH RECONSTITUTION PACKET RECEIPT
            // Sends everything the React frontend needs to rebuild the view state instantly with zero lag
            socket.emit("reconnect-success", {
                roomTitle: activeRoom.title,
                roomId: activeRoom._id,
                currentCachedScore: cachedScore,
                serverTimerSnapshot: calculatedRemainingSeconds
            });

            console.log(`Player Session Recovered! User [${userId}] checked back into Room channel: ${cleanCode}`);

        } catch (error) {
            console.error("Exception captured inside player reconnect handler:", error.message);
            socket.emit("reconnect-error", { message: "Internal server anomaly during state recovery." });
        }
    });
};
