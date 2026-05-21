import { RoomQuestion } from "../../models/roomQuestion.model.js";
import { Answer } from "../../models/answer.model.js";
import { incrementRedisPlayerScore } from "../../runtime/roomStore.js";


//   Listens for individual real-time option selection choices from active player stream pipes

export const handleSubmitAnswer = (io, socket) => {
    socket.on("submit-answer", async (payload) => {
        try {
            // Sockets securely read roomCode and userId bound to this socket instance context during join-lobby!
            const { roomCode, userId } = socket;
            const { sequenceNumber, submittedOptionId, serverTimerSnapshot } = payload;

            if (!roomCode || !userId || !submittedOptionId) return;

            //  TIMING VALIDATION ATTACK SHIELD
            // If the server snapshot reads 0 or less, the round is physically over. Lock data entry!
            if (serverTimerSnapshot <= 0) {
                return socket.emit("submission-error", { message: "Time expired! Submission dropped." });
            }

            //  FETCH QUESTION ANSWER SCHEMA KEY RULES
            const mapping = await RoomQuestion.findOne({ 
                room: socket.roomObjectId || payload.roomId, // Handles clean fallback mapping hooks
                sequenceNumber: sequenceNumber 
            }).populate("question");

            if (!mapping) return;
            const questionData = mapping.question;

            //  SECURE PREVENT DOUBLE SUBMISSIONS (MongoDB Compound Index Shield)
            // Check if this player has already written a row entry for this specific question round
            const alreadyAnswered = await Answer.findOne({
                room: mapping.room,
                player: userId,
                question: questionData._id
            });

            if (alreadyAnswered) {
                return socket.emit("submission-error", { message: "Security Warning: You have already submitted an answer for this round!" });
            }

            //  VERIFY LOGIC CORRECTNESS MATCHES
            const isCorrectAnswer = questionData.correctAnswer === submittedOptionId.trim().toUpperCase();
            
            let pointsEarned = 0;
            const totalRoundDuration = questionData.duration || 30;

            if (isCorrectAnswer) {
                // Execute our server-side Speed Scoring Matrix Formula
                const speedFraction = serverTimerSnapshot / totalRoundDuration;
                pointsEarned = 500 + Math.round(speedFraction * 500); // Scales scale seamlessly from 500 to 1000 points
            }

            //  HIGH SPEED SCORING COMMIT (Redis RAM)
            if (pointsEarned > 0) {
                await incrementRedisPlayerScore(roomCode, userId, pointsEarned);
                console.log(`Player [${userId}] earned +${pointsEarned} pts inside Redis memory pool.`);
            }

            //  PERSISTENT SYSTEM TRANSACTION WRITE (MongoDB History Logs)
            // We write a historical log entry for long-term database analytics
            await Answer.create({
                room: mapping.room,
                player: userId,
                question: questionData._id,
                submittedAnswer: submittedOptionId,
                isCorrect: isCorrectAnswer,
                responseTimeMs: (totalRoundDuration - serverTimerSnapshot) * 1000 // Convert delta to milliseconds metric
            });

            // Return individual acknowledgement receipt back to this specific user's browser view
            socket.emit("answer-acknowledged", { 
                success: true, 
                isCorrect: isCorrectAnswer,
                points: pointsEarned
            });

        } catch (error) {
            console.error(" Exception captured inside submit-answer handler:", error.message);
        }
    });
};
