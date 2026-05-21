import { Room } from "../../models/room.model.js";
import { runGameLoopEngine } from "../../runtime/roomRuntime.js";


//   Listens for the host sending the start command signal to kick off the game engine loop
 
export const handleStartQuiz = (io, socket) => {
    socket.on("start-quiz", async (payload) => {
        try {
            const { roomCode, hostId } = payload;

            if (!roomCode || !hostId) return;

            const cleanCode = roomCode.toUpperCase().trim();

            // Security Gate: Confirm this room exists, is waiting, and that this socket caller is the ACTUAL host!
            const room = await Room.findOne({ roomCode: cleanCode, host: hostId, status: "waiting" });
            if (!room) {
                return socket.emit("start-error", { message: "Action denied: Only the room host can launch the quiz" });
            }

            // Atomically upgrade the persistent state status so no more loose HTTP players can enter the gate
            room.status = "active";
            room.startedAt = new Date();
            await room.save({ validateBeforeSave: false });

            console.log(`Host [${hostId}] launched active game state loop for Room: ${cleanCode}`);

            // Kick off our self-driving in-memory loop engine!
            runGameLoopEngine(io, cleanCode, room._id);

        } catch (error) {
            console.error(" Error during quiz launch:", error.message);
        }
    });
};
