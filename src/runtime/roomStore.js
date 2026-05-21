import { redisClient } from "../config/redis.js";


//   Command used: sADD (Set Add) - Appends a unique value to a specified set key.
 
export const addPlayerToRedisLobby = async (roomCode, userId) => {
    const key = `room:${roomCode.toUpperCase()}:players`;
    // sADD returns 1 if added, 0 if the user was already inside the set
    return await redisClient.sAdd(key, String(userId));
};

// GET CURRENT PLAYER COUNT
//   Command used: sCARD (Set Cardinality) - Returns the exact size/length of a specified set.

export const getRedisLobbyCount = async (roomCode) => {
    const key = `room:${roomCode.toUpperCase()}:players`;
    return await redisClient.sCard(key);
};

// FETCH ALL ACTIVE PLAYERS IN LOBBY
//   Command used: sMEMBERS (Set Members) - Returns every item stored inside the specified set as an array.
 
export const getRedisLobbyPlayers = async (roomCode) => {
    const key = `room:${roomCode.toUpperCase()}:players`;
    return await redisClient.sMembers(key); // Returns an array of User IDs e.g., ["id1", "id2"]
};

//  REMOVE PLAYER FROM LOBBY (On Disconnect)
//  Command used: sREM (Set Remove) - Erases a specified value from a set.
 
export const removePlayerFromRedisLobby = async (roomCode, userId) => {
    const key = `room:${roomCode.toUpperCase()}:players`;
    return await redisClient.sRem(key, String(userId));
};



//   INCREMENT PLAYER SCORE IN REAL-TIME
//  Command used: ZINCRBY - Increments the score of a member in a sorted set.
//  Key format: room:{roomCode}:leaderboard

export const incrementRedisPlayerScore = async (roomCode, userId, points) => {
    const key = `room:${roomCode.toUpperCase()}:leaderboard`;
    // ZINCRBY automatically creates the player entry if it doesn't exist
    return await redisClient.zIncrBy(key, points, String(userId));
};

//  FETCH CURRENT ROUND LEADERBOARD (Sorted from Highest to Lowest)
//   Command used: ZREVRANGE - Returns a range of members in a sorted set, by score high to low.
 
export const getRedisLiveLeaderboard = async (roomCode) => {
    const key = `room:${roomCode.toUpperCase()}:leaderboard`;
    
    // Node-Redis v4 dynamic standard approach for reverse zset fetches
    return await redisClient.zRangeWithScores(key, 0, -1, {
        REV: true // This single flag tells Redis to automatically sort from HIGHEST to LOWEST score!
    });
};
