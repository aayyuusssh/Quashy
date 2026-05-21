import { handleJoinLobby } from "./Handlers/joinRoom.js"; //  Join room handler ko import kiya
import { removePlayerFromRedisLobby, getRedisLobbyPlayers } from "../runtime/roomStore.js"; // Cleanup functions
import { handleStartQuiz } from "./Handlers/startGame.js";
import { handleSubmitAnswer } from "./Handlers/submitAnswer.js";
import { User } from "../models/user.model.js";


export const registerSocketEvents = (io) => {
    io.on("connection", (socket) => {
        console.log(` New player connected to stream! Socket ID: ${socket.id}`);

        // . MOUNT THE JOIN LOBBY CONTROLLER
        // Is line se socket active mode me "join-lobby" event ko listen karna shuru kar dega
        handleJoinLobby(io, socket);
        handleStartQuiz(io, socket);
        handleSubmitAnswer(io, socket); 

        // purana test event listener (isey rehne dete hain testing ke liye)
        socket.on("ping-test", (data) => {
            console.log("Received data from client:", data);
            socket.emit("pong-test", { message: "Hello from the backend real-time stream!" });
        });

        //  AUTOMATED LOBBY CLEANUP (On Disconnect)
        socket.on("disconnect", async () => {
            console.log(` Player disconnected. Socket ID closed: ${socket.id}`);
            
            // Hum check karenge kya ye user pehle kisi room ke andar enter hua tha?
            // (Ye values humne handleJoinLobby ke andar socket object par bind ki thi!)
            const { roomCode, userId } = socket;

            if (roomCode && userId) {
                // High-speed RAM pipeline: Redis Set se is user ka ID delete karo
                await removePlayerFromRedisLobby(roomCode, userId);
                console.log(` Cleaned ghost player [${userId}] from Redis room: ${roomCode}`);

                // Real-time Sync: Ab bache hue active members ki list nikaalo
                const remainingPlayerIds = await getRedisLobbyPlayers(roomCode);

                // MongoDB se un bache hue users ki display profiles fetch karo
                const hydratedPlayersList = await User.find({ _id: { $in: remainingPlayerIds } })
                    .select("username avatar");

                // Poore room me broadcast kardo taaki baaki players ki screen par ye user instantly gayab ho jaye!
                io.to(roomCode).emit("player-list-updated", {
                    players: hydratedPlayersList
                });
            }
        });
    });
};
