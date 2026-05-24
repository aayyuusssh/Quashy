import { handleJoinLobby } from "./handlers/joinRoom.js";
import { handleStartQuiz } from "./handlers/startGame.js";
import { handleSubmitAnswer } from "./handlers/submitAnswer.js";
import { handlePlayerReconnect } from "./handlers/reconnectPlayer.js"; //  IMPORT HANDLER
import { removePlayerFromRedisLobby, getRedisLobbyPlayers, getRedisLobbyCount } from "../runtime/roomStore.js";
import { terminateOrphanedRoomTimer } from "../runtime/roomRuntime.js";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js"; // Needed for checking status on disconnection

export const registerSocketEvents = (io) => {
    io.on("connection", (socket) => {
        console.log(` New player connected to stream! Socket ID: ${socket.id}`);

        // Mount all secure real-time streaming modules 
        handleJoinLobby(io, socket);
        handleStartQuiz(io, socket);
        handleSubmitAnswer(io, socket);
        handlePlayerReconnect(io, socket); //  MOUNT ACTIVE RECONNECTION HOOKS

        socket.on("disconnect", async () => {
            console.log(`Player disconnected. Socket ID closed: ${socket.id}`);
            
            const { roomCode, userId } = socket;

            if (roomCode && userId) {
                const cleanCode = roomCode.toUpperCase().trim();

                // SMART MID-GAME PROTECTION DISCONNECT GATEWAY
                // Check if the match is actively in progress or still in a waiting lobby
                const room = await Room.findOne({ roomCode: cleanCode });
                
                // CRITICAL RULE: If the game has already started ("active"), DO NOT delete them from Redis sets! 
                // This keeps their scoring slots reserved and allows them to reconnect cleanly.
                if (room && room.status === "waiting") {
                    await removePlayerFromRedisLobby(cleanCode, userId);
                    console.log(`Cleaned user [${userId}] from pre-game waiting lobby.`);
                } else if (room && room.status === "active") {
                    console.log(`Player [${userId}] went offline mid-game. Scoreboard entry preserved for reconnection.`);
                }

                // Check remaining active count size metrics to clean zombie intervals
                const remainingActivePlayersCount = await getRedisLobbyCount(cleanCode);
                if (remainingActivePlayersCount <= 0) {
                    terminateOrphanedRoomTimer(cleanCode);
                } else {
                    const remainingPlayerIds = await getRedisLobbyPlayers(cleanCode);
                    const hydratedPlayersList = await User.find({ _id: { $in: remainingPlayerIds } }).select("username avatar");
                    io.to(cleanCode).emit("player-list-updated", { players: hydratedPlayersList });
                }
            }
        });
    });
};
