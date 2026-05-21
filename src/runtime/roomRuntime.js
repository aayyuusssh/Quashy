import { RoomQuestion } from "../models/roomQuestion.model.js";
import { Room } from "../models/room.model.js";
import { GameResult } from "../models/gameResult.model.js";
import { User } from "../models/user.model.js";
import { redisClient } from "../config/redis.js";
import { getRedisLiveLeaderboard } from "./roomStore.js";

// Global in-memory reference object to track active room intervals
// Key: roomCode -> Value: setInterval ID pointer
const activeRoomTimers = {};

/**
 * Self-driving real-time engine that orchestrates question rounds sequentially.
 * @param {Object} io - Global Socket.io instance
 * @param {string} roomCode - The 6-digit room identifier string
 * @param {string} roomId - MongoDB Room Document Object ID
 * @param {number} currentRound - The current round sequence number to execute
 */
export const runGameLoopEngine = async (io, roomCode, roomId, currentRound = 1) => {
    const cleanCode = roomCode.toUpperCase().trim();

    try {
        // 1. FETCH BOUND TIMELINE SEQUENCE INDEX MAP
        const currentMapping = await RoomQuestion.findOne({ 
            room: roomId, 
            sequenceNumber: currentRound 
        }).populate("question");

        // IF NO MAP EXISTS: The match has officially run out of questions. Run Archive!
        if (!currentMapping) {
            return handleGameOverArchive(io, cleanCode, currentRound);
        }

        // 2. CRITICAL SAFETY GUARD: Prevent dead database reference pointer crashes
        if (!currentMapping.question) {
            console.error(`Data Anomaly: Sequence map found for round ${currentRound}, but the underlying question document was deleted from MongoDB. Auto-skipping...`);
            // Graceful Auto-Advance: Fallback to next sequence round cleanly without crashing the server
            return runGameLoopEngine(io, cleanCode, roomId, currentRound + 1);
        }

        const questionData = currentMapping.question;
        let secondsRemaining = questionData.duration || 30; // Hydrate timer length

        // 3. BROADCAST QUESTION DATA (Hides 'correctAnswer' key to block client-side inspect source cheating)
        io.to(cleanCode).emit("round-started", {
            sequenceNumber: currentRound,
            questionText: questionData.questionText,
            options: questionData.options,
            duration: secondsRemaining
        });

        console.log(`Round [${currentRound}] launched in Room [${cleanCode}]. Seconds allocated: ${secondsRemaining}s`);

        // Clear any lingering asynchronous cycles before spinning a new loop layer
        if (activeRoomTimers[cleanCode]) clearInterval(activeRoomTimers[cleanCode]);

        // 4. INITIATE SERVER TIMER CHRONOMETER
        activeRoomTimers[cleanCode] = setInterval(async () => {
            secondsRemaining--;

            // Push tick update broadcast packet down the pipes to keep all React devices perfectly synchronized
            io.to(cleanCode).emit("timer-ticked", { secondsRemaining });

            // 5. WINDOW TIMELINE EXPIRED TRIGGER
            if (secondsRemaining <= 0) {
                clearInterval(activeRoomTimers[cleanCode]);
                console.log(`Round [${currentRound}] timeline closed for Room [${cleanCode}]. Processing standings...`);

                // Read high-speed rankings directly from Redis Sorted Sets
                const rawZsetData = await getRedisLiveLeaderboard(cleanCode);
                
                // Map flat Redis array payloads into clean structured profile objects for React
                const roundLeaderboard = [];
                for (let i = 0; i < rawZsetData.length; i++) {
                    const userDoc = await User.findById(rawZsetData[i].value).select("username avatar");
                    if (userDoc) {
                        roundLeaderboard.push({
                            player: userDoc,
                            score: rawZsetData[i].score,
                            rank: i + 1
                        });
                    }
                }

                // Broadcast round results, explanation data, and active scoreboard positions
                io.to(cleanCode).emit("round-ended", {
                    correctAnswerId: questionData.correctAnswer,
                    explanation: questionData.explanation || "",
                    leaderboard: roundLeaderboard
                });

                // Wait 8 seconds for users to look at the scoreboard before auto-advancing to the next question
                setTimeout(() => {
                    runGameLoopEngine(io, cleanCode, roomId, currentRound + 1);
                }, 8000);
            }
        }, 1000); // Ticks precisely once every 1 second

    } catch (error) {
        console.error(`Critical runtime error inside Room [${cleanCode}] engine loop:`, error.message);
        if (activeRoomTimers[cleanCode]) clearInterval(activeRoomTimers[cleanCode]);
    }
};

/**
 * Handles compiling final scores, saving persistent history archives, and recycling room structures.
 * @param {Object} io - Global Socket.io instance
 * @param {string} roomCode - The active room's 6-digit identifier string
 * @param {number} currentRound - The tracking round marker used to compile total questions played
 */
const handleGameOverArchive = async (io, roomCode, currentRound) => {
    try {
        const cleanCode = roomCode.toUpperCase().trim();

        // 1. Flush memory ticking loops from server processes
        if (activeRoomTimers[cleanCode]) clearInterval(activeRoomTimers[cleanCode]);
        delete activeRoomTimers[cleanCode];

        // 2. Locate room rules document from MongoDB
        const room = await Room.findOne({ roomCode: cleanCode, status: "active" });
        if (!room) {
            console.log(`Archival aborted: Room ${cleanCode} was already processed or is missing.`);
            return;
        }

        // 3. FETCH ABSOLUTE FINAL SCORE RANKINGS OUT OF REDIS SORTED SETS
        const finalZsetData = await redisClient.zRangeWithScores(`room:${cleanCode}:leaderboard`, 0, -1, {
            REV: true // Sort from highest score down to lowest score
        });

        // 4. BUILD THE HISTORICAL DATA SNAPSHOT ARRAY
        const structuredLeaderboard = [];
        let absoluteWinnerId = null;

        for (let i = 0; i < finalZsetData.length; i++) {
            const currentUserId = finalZsetData[i].value;
            const currentFinalScore = finalZsetData[i].score;

            if (i === 0) absoluteWinnerId = currentUserId; // Top spot gets the crown

            structuredLeaderboard.push({
                player: currentUserId,
                finalScore: currentFinalScore,
                rank: i + 1
            });
        }

        // Host serves as default winner fallback if zero answers were submitted during match
        if (!absoluteWinnerId) absoluteWinnerId = room.host;

        // 5. COMPILE TRANSACTION RECORD TO MONGO LONG-TERM HISTORY COLLECTIONS
        await GameResult.create({
            room: room._id,
            winner: absoluteWinnerId,
            leaderboard: structuredLeaderboard,
            totalQuestions: structuredLeaderboard.length > 0 ? currentRound - 1 : 0,
            finishedAt: new Date()
        });

        // 6. UPDATE CURRENT LOBBY LIFECYCLE TARGET (Triggers MongoDB Partial Unique index release)
        room.status = "finished";
        room.endedAt = new Date();
        await room.save({ validateBeforeSave: false });

        // Broadcast final results packet to all screens so React displays the podium trophy screen
        io.to(cleanCode).emit("game-over", { 
            message: "The quiz has concluded!",
            winnerId: absoluteWinnerId,
            leaderboard: structuredLeaderboard
        });

        // 7. MEMORY DE-ALLOCATION: Clear the volatile high-velocity tracking keys out of Redis RAM memory
        await redisClient.del(`room:${cleanCode}:players`);
        await redisClient.del(`room:${cleanCode}:leaderboard`);

        console.log(` Match finalized, archived to MongoDB, and code recycled successfully for Room: ${cleanCode}`);

    } catch (error) {
        console.error(" Exception captured inside game-over archive processor:", error.message);
    }
};
