import { Room } from "../../models/room.model.js";
import { runGameLoopEngine } from "../../runtime/roomRuntime.js";
import { RoomQuestion } from "../../models/roomQuestion.model.js";

//   Listens for the host sending the start command signal to kick off the game engine loop
 
export const handleStartQuiz = (io, socket) => {
    socket.on("start-quiz", async (payload) => {
        try {
            if (!socket.user) {
                return socket.emit("auth-error", { message: "Authentication required" });
            }
            
            const { roomCode } = payload;
            const authenticatedHostId = socket.user?._id; 
            const cleanCode = roomCode.toUpperCase().trim();

            if (!roomCode ) return;


            // Security Gate: Confirm this room exists, is waiting, and that this socket caller is the ACTUAL host!
            const room = await Room.findOne({ roomCode: cleanCode, host: authenticatedHostId, status: "waiting" });
            if (!room) {
                return socket.emit("start-error", { message: "Action denied: Only the room host can launch the quiz" });
            }

            const questionCount = await RoomQuestion.countDocuments({ room: room._id });
            if (questionCount === 0) {
                return socket.emit("start-error", { message: "No questions mapped to this room" });
            }

            // Atomically upgrade the persistent state status so no more loose HTTP players can enter the gate
            room.status = "active";
            room.startedAt = new Date();
            await room.save({ validateBeforeSave: false });

            console.log(`Host [${authenticatedHostId}] launched active game state loop for Room: ${cleanCode}`);

            // Kick off our self-driving in-memory loop engine!
            runGameLoopEngine(io, cleanCode, room._id);

        } catch (error) {
            console.error(" Error during quiz launch:", error.message);
            socket.emit("start-error", { message: "Internal server error while starting quiz" });
        }
    });
};
