import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { GameResult } from "../models/gameResult.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const getUserDetails = async(userId)=> {
    if(!userId){
        throw new ApiError(404 , "User Id is missing")
    }

    const user = await User.findById(userId)
    if(!user){
        throw new ApiError(404 , "User not found")
    }

    return user;
}

export const getUserGameStats = async(userId)=>{
     // INDUSTRY BEST PRACTICE: Player Analytics Aggregation
        // Hum GameResult collection me check karenge ki is player ne kya kya teer maare hain
        const playerStats = await GameResult.aggregate([
            {
                // Pehle filter karo sirf is specific player ke saare match results
                $match: {
                    "leaderboard.player": new mongoose.Types.ObjectId(userId)
                }
            },
            {
                // Saare matches ka data aapas me jod kar calculations karo
                $group: {
                    _id: null,
                    totalGamesPlayed: { $sum: 1 }, // Total kitne matches khele
                    
                    // Ye check karega ki winner field user ki ID se match karti hai ya nahi
                    totalWins: {
                        $sum: {
                            $cond: [{ $eq: ["$winner", new mongoose.Types.ObjectId(userId)] }, 1, 0]
                        }
                    },
                    
                    // Is player ke har match ke finalScore ka total sum nikaalo
                    totalScore: {
                        // $unwind ke bina embedded array ka sum nikalne ka tareeqa:
                        $sum: {
                            $let: {
                                vars: {
                                    playerEntry: {
                                        $filter: {
                                            input: "$leaderboard",
                                            as: "lb",
                                            cond: { $eq: ["$$lb.player", new mongoose.Types.ObjectId(userId)] }
                                        }
                                    }
                                },
                                in: { $arrayElemAt: ["$$playerEntry.finalScore", 0] }
                            }
                        }
                    }
                }
            }
        ]);
    
        // Agar user ne abhi tak ek bhi game nahi khela, toh default stats set kardo
        const defaultStats = {
            totalGamesPlayed: 0,
            totalWins: 0,
            totalScore: 0
        };
    
        const finalStats = playerStats.length > 0 ? playerStats[0] : defaultStats;
        delete finalStats._id; // Extra MongoDB metadata remove karne ke liye
    
        return finalStats;

}

