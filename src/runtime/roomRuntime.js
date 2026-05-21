import { RoomQuestion } from "../models/roomQuestion.model.js";
import { getRedisLiveLeaderboard } from "./roomStore.js";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import { GameResult } from "../models/gameResult.model.js";
import { redisClient } from "../config/redis.js";

// Global, in-memory reference object to store active ticking intervals for rooms.
// Key: roomCode -> Value: setInterval instance ID.
// This prevents timers from overlapping if buttons are clicked multiple times.
const activeRoomTimers = {};

/**
 * Orchestrates the active gameplay progression round-by-round.
 * @param {Object} io - Global Socket.io instance
 * @param {string} roomCode - The active room's 6-digit identifier
 * @param {string} roomId - MongoDB Room Object ID
 * @param {number} currentRound - Current sequenceNumber to execute
 */
export const runGameLoopEngine = async (io, roomCode, roomId, currentRound = 1) => {
    const cleanCode = roomCode.toUpperCase().trim();

    //  FETCH CURRENT BOUND QUESTION (From HTTP mapped table)
    const currentMapping = await RoomQuestion.findOne({ 
        room: roomId, 
        sequenceNumber: currentRound 
    }).populate("question");

    // If no mapping is found, it means we have run out of questions. The game is officially over!
    if (!currentMapping) {
        return handleGameOverArchive(io, cleanCode);
    }

    const questionData = currentMapping.question;
    let secondsRemaining = questionData.duration || 30; // Initialize round timeline

    //  BROADCAST QUESTION TO PLAYERS
    // Notice we do NOT send the 'correctAnswer' string to the frontend! This blocks cheating.
    io.to(cleanCode).emit("round-started", {
        sequenceNumber: currentRound,
        questionText: questionData.questionText,
        options: questionData.options,
        duration: secondsRemaining
    });

    console.log(` Round [${currentRound}] started in Room [${cleanCode}]. Timer set to: ${secondsRemaining}s`);

    // Clear any loose intervals for this room code before spinning up a new one
    if (activeRoomTimers[cleanCode]) clearInterval(activeRoomTimers[cleanCode]);

    // START CENTRAL SERVER TICK TICK LOOP
    activeRoomTimers[cleanCode] = setInterval(async () => {
        secondsRemaining--;

        // Push the new remaining second down the streaming pipes instantly
        io.to(cleanCode).emit("timer-ticked", { secondsRemaining });

        // ROUND TIME EXPIRED TRIGGERS
        if (secondsRemaining <= 0) {
            clearInterval(activeRoomTimers[cleanCode]); // Stop the ticking wheel
            console.log(` Round [${currentRound}] expired for Room [${cleanCode}]. Computing scores...`);

            // Fetch the current ranking matrix out of high-speed Redis Sorted Sets
            const rawZsetData = await getRedisLiveLeaderboard(cleanCode);
            
            // Map the flat Redis array into a clean JSON layout format for React
            const roundLeaderboard = [];
            for (let i = 0; i < rawZsetData.length; i++) {
                const userDoc = await User.findById(rawZsetData[i].value).select("username avatar");
                roundLeaderboard.push({
                    player: userDoc,
                    score: rawZsetData[i].score,
                    rank: i + 1
                });
            }

            // Broadcast round results, answers, and mid-game standings scoreboard
            io.to(cleanCode).emit("round-ended", {
                correctAnswerId: questionData.correctAnswer,
                explanation: questionData.explanation || "",
                leaderboard: roundLeaderboard
            });

            // Wait 8 seconds for players to look at the scoreboard before auto-advancing to the next question
            setTimeout(() => {
                runGameLoopEngine(io, cleanCode, roomId, currentRound + 1);
            }, 8000);
        }
    }, 1000); // Triggers exactly once every 1000 milliseconds (1 second)
};



//  Handles compiling final rankings, saving results to MongoDB, and flushing temporary Redis tracks
 
export const handleGameOverArchive = async (io, roomCode) => {
    try {
        const cleanCode = roomCode.toUpperCase().trim();

        // 1. Clear any active runtime ticking wheels from server RAM memory
        if (activeRoomTimers[cleanCode]) clearInterval(activeRoomTimers[cleanCode]);
        delete activeRoomTimers[cleanCode];

        // 2. Fetch the target room profile rules from MongoDB
        const room = await Room.findOne({ roomCode: cleanCode, status: "active" });
        if (!room) return;

        // 3. FETCH ABSOLUTE FINAL LEADERBOARD OUT OF REDIS SORTED SETS
        const finalZsetData = await redisClient.zRangeWithScores(`room:${cleanCode}:leaderboard`, 0, -1, {
            REV: true // Sort from highest score to lowest score
        });

        // 4. MAP DATA INTO MONGO ARCHIVE SUMMARY ARRAY FORMAT
        const structuredLeaderboard = [];
        let absoluteWinnerId = null;

        for (let i = 0; i < finalZsetData.length; i++) {
            const currentUserId = finalZsetData[i].value;
            const currentFinalScore = finalZsetData[i].score;

            // The very first index position (index 0) holds the highest score — crown them the winner!
            if (i === 0) absoluteWinnerId = currentUserId;

            structuredLeaderboard.push({
                player: currentUserId,
                finalScore: currentFinalScore,
                rank: i + 1
            });
        }

        // Safety fallback: If no one answered any questions, assign the room host as default winner reference
        if (!absoluteWinnerId) absoluteWinnerId = room.host;

        // 5. WRITE PERMANENT TRANSACTION RECORD TO MONGO HISTORY COLLECTIONS
        await GameResult.create({
            room: room._id,
            winner: absoluteWinnerId,
            leaderboard: structuredLeaderboard,
            totalQuestions: structuredLeaderboard.length > 0 ? currentRound - 1 : 0, // Compiles total round count
            finishedAt: new Date()
        });

        // 6. UPDATE LOBBY LIFE STATUS (Triggers the MongoDB Partial Index rules!)
        room.status = "finished";
        room.endedAt = new Date();
        await room.save({ validateBeforeSave: false });

        // Broadcast final match over state to React. Pass the final leaderboard array for the trophy screen!
        io.to(cleanCode).emit("game-over", { 
            message: "The quiz has concluded!",
            winnerId: absoluteWinnerId,
            leaderboard: structuredLeaderboard
        });

        // 7. MEMORY FLUSH: Clear the temporary, high-velocity volatile keys out of Redis RAM memory
        // This keeps your database lightweight, clean, and completely optimized.
        await redisClient.del(`room:${cleanCode}:players`);
        await redisClient.del(`room:${cleanCode}:leaderboard`);

        console.log(` Match finalized, archived to MongoDB, and code recycled successfully for Room: ${cleanCode}`);

    } catch (error) {
        console.error("Critical exception captured during game-over archive processing:", error.message);
    }
};
