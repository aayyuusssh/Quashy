import { RoomQuestion } from "../../models/roomQuestion.model.js";
import { Answer } from "../../models/answer.model.js";
import { Room } from "../../models/room.model.js";
import { incrementRedisPlayerScore } from "../../runtime/roomStore.js";

export const handleSubmitAnswer = (io, socket) => {
    socket.on("submit-answer", async (payload) => {
        try {
            const { roomCode, userId } = socket;
            const { sequenceNumber, submittedOptionId, serverTimerSnapshot } = payload;

            // What did the backend actually receive?
            // console.log(" [CHECKPOINT 1] Received Payload:", {
            //     socketRoomCode: roomCode,
            //     socketUserId: userId,
            //     payloadSeq: sequenceNumber,
            //     payloadOption: submittedOptionId,
            //     payloadTimer: serverTimerSnapshot
            // });

            if (!roomCode || !userId || !submittedOptionId) {
                console.log(" Missing core fields in socket context or payload");
                return;
            }

            // TIMING VALIDATION SHIELD
            if (serverTimerSnapshot <= 0) {
                console.log("Dropped: Time already expired! snapshot <= 0");
                return socket.emit("submission-error", { message: "Time expired! Submission dropped." });
            }

            // FETCH REAL ACTIVE ROOM DATA
            const activeRoomData = await Room.findOne({ roomCode: roomCode, status: "active" });
            
            // console.log(" [CHECKPOINT 2] Active Room DB Query Result:", activeRoomData ? `Found Room ID: ${activeRoomData._id}` : "NOT FOUND IN DB");

            if (!activeRoomData) {
                console.log(` No active room found for code ${roomCode}`);
                return;
            }

            // FETCH QUESTION MAPPING
            const mapping = await RoomQuestion.findOne({ 
                room: activeRoomData._id, 
                sequenceNumber: Number(sequenceNumber) 
            }).populate("question");

            //  Did we find the question sequence mapping?
            // console.log("[CHECKPOINT 3] RoomQuestion Mapping Query Result:", mapping ? `Found Question: ${mapping.question?.questionText?.substring(0, 20)}...` : "NOT FOUND IN DB");

            if (!mapping) {
                console.log(` No question mapped for sequenceNumber ${sequenceNumber} in this room.`);
                return;
            }

            const questionData = mapping.question;

            //  SECURE PREVENT DOUBLE SUBMISSIONS
            const alreadyAnswered = await Answer.findOne({
                room: mapping.room,
                player: userId,
                question: questionData._id
            });

            //  DEBUG CHECKPOINT 4: Has the player already submitted for this question?
            // console.log("  Double Submission Check Result:", alreadyAnswered ? "ALREADY ANSWERED" : "CLEAN (FIRST TIME)");

            if (alreadyAnswered) {
                console.log(" Dropped at Checkpoint 4: Prevented duplicate submission attempt");
                return socket.emit("submission-error", { message: "Security Warning: You have already submitted an answer for this round!" });
            }

            //  EVALUATION & SCORING
            const isCorrectAnswer = questionData.correctAnswer === submittedOptionId.trim().toUpperCase();
            let pointsEarned = 0;
            const totalRoundDuration = questionData.duration || 30;

            if (isCorrectAnswer) {
                const speedFraction = serverTimerSnapshot / totalRoundDuration;
                pointsEarned = 500 + Math.round(speedFraction * 500);
            }

            if (pointsEarned > 0) {
                await incrementRedisPlayerScore(roomCode, userId, pointsEarned);
                console.log(` Player [${userId}] earned +${pointsEarned} pts inside Redis memory pool.`);
            }

            await Answer.create({
                room: mapping.room,
                player: userId,
                question: questionData._id,
                submittedAnswer: submittedOptionId,
                isCorrect: isCorrectAnswer,
                responseTimeMs: (totalRoundDuration - serverTimerSnapshot) * 1000
            });

            // console.log("SUCCESS: Sending acknowledgment packet back to client!");
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
