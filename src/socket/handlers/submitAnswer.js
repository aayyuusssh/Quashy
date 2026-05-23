import { RoomQuestion } from "../../models/roomQuestion.model.js";
import { Answer } from "../../models/answer.model.js";
import { Room } from "../../models/room.model.js";
import { incrementRedisPlayerScore } from "../../runtime/roomStore.js";
import { activeRoundStartTimeStamps } from "../../runtime/roomRuntime.js";

export const handleSubmitAnswer = (io, socket) => {
    socket.on("submit-answer", async (payload) => {
        try {
            // Securely grab cached data from the authenticated socket instance context
            const { roomCode, userId } = socket;
            const { sequenceNumber, submittedOptionId } = payload;

            if (!roomCode || !userId || typeof submittedOptionId !== 'string' || !submittedOptionId  || sequenceNumber == null || !Number.isInteger(Number(sequenceNumber)) || Number(sequenceNumber) < 0) {
                return socket.emit("submission-error", { message: "Invalid payload: Missing context parameters." });
            }


            const cleanCode = roomCode.toUpperCase().trim();

            // 1. ANTI-SPAM WEB-SOCKET RATELIMIT TRACKER
            // Blocks automated loops from hammering the database with a 400ms cooldown barrier
            const now = Date.now();
            if (socket.lastSubmissionTime && (now - socket.lastSubmissionTime < 400)) {
                return socket.emit("submission-error", { message: "Spam Guard Active: Multi-clicking is blocked." });
            }
            socket.lastSubmissionTime = now;

            // 2. CRYPTOGRAPHIC TIME EVALUATOR
            // Read true server timestamp when this specific round was broadcasted
            const roundStartTime = activeRoundStartTimeStamps[cleanCode];
            if (!roundStartTime) {
                return socket.emit("submission-error", { message: "Submission rejected: No active round timer found." });
            }

            // Calculate precise elapsed time completely on the server
            const elapsedMilliseconds = Date.now() - roundStartTime;
            const elapsedSeconds = elapsedMilliseconds / 1000;

            // 3. FETCH ACTIVE ROOM DOCUMENT DYNAMICALLY FROM DB USING THE CODE
            const activeRoomData = await Room.findOne({ roomCode: cleanCode, status: "active" });
            if (!activeRoomData) {
                return socket.emit("submission-error", { message: "Submission rejected: Room is no longer active." });
            }

            // 4. LOCATE ACCURATE QUESTION SCHEMATICS
            const mapping = await RoomQuestion.findOne({ 
                room: activeRoomData._id, 
                sequenceNumber: Number(sequenceNumber) 
            }).populate("question");

            if (!mapping || !mapping.question) {
                return socket.emit("submission-error", { message: "Error: Question mapping sequence corrupted or missing." });
            }

            const questionData = mapping.question;
            const totalRoundDuration = questionData.duration || 30;

            // Calculate exact remaining seconds using server-driven timeline
            const absoluteServerRemainingTime = totalRoundDuration - elapsedSeconds;

            // 5. SERVER TIME WINDOW SECURITY CLOSURE
            // Drop client payloads instantly if they land after the server clock has touched zero
            if (absoluteServerRemainingTime <= 0) {
                return socket.emit("submission-error", { message: "Time expired! Submission dropped by the server clock." });
            }

            // 6. BLOCK DOUBLE SUBMISSION EXPLOITS
            const alreadyAnswered = await Answer.findOne({
                room: activeRoomData._id,
                player: userId,
                question: questionData._id
            });

            if (alreadyAnswered) {
                return socket.emit("submission-error", { message: "Security Warning: Option already logged for this question." });
            }
            

            // 7. MULTIPLIER SCORING MATRIX COMPLETELY VERIFIED BY SERVER TIMERS
            const isCorrectAnswer = questionData.correctAnswer.trim().toUpperCase() === submittedOptionId.trim().toUpperCase();
            
            let pointsEarned = 0;
            if (isCorrectAnswer) {
                const speedFraction = absoluteServerRemainingTime / totalRoundDuration;
                pointsEarned = 500 + Math.round(speedFraction * 500); // Dynamic bonus points scale from 500 up to 1000
            }

            // 8. WRITE PERFORMANCE TO IN-MEMORY RAM STORAGE (Redis)
            if (pointsEarned > 0) {
                await incrementRedisPlayerScore(cleanCode, userId, pointsEarned);
                console.log(`Server verified score! Player [${userId}] earned +${pointsEarned} pts inside Redis RAM.`);
            }

            // 9. PERSISTENT LONG-TERM TRANSACTION WRITE (MongoDB History Logs)
            await Answer.create({
                room: activeRoomData._id,
                player: userId,
                question: questionData._id,
                submittedAnswer: submittedOptionId,
                isCorrect: isCorrectAnswer,
                responseTimeMs: elapsedMilliseconds // Logs real network connection latency
            });

            // Fire response packet back to player tab view
            socket.emit("answer-acknowledged", { 
                success: true, 
                isCorrect: isCorrectAnswer,
                points: pointsEarned
            });

        } catch (error) {
            console.error(" Exception captured inside submit-answer handler:", error.message);
            socket.emit("submission-error", { message: "Internal server anomaly while logging option submission." });
        }
    });
};
