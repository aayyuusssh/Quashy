import { GameResult } from "../models/gameResult.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


//  GET USER GAME HISTORY (Paginated)
//  Fetches a list of all matches a specific logged-in user has completed.
 
const getUserGameHistory = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Page and limit parameters must be positive integers");
    }

    const historyFilter = {
        "leaderboard.player": userId
    };

    const totalGames = await GameResult.countDocuments(historyFilter);
    
    const games = await GameResult.find(historyFilter)
        .populate("room", "title") 
        .populate("winner", "username avatar") 
        .populate("leaderboard.player", "username avatar")
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit);

    return res
        .status(200)
        .json(
        new ApiResponse(
            200,
            {
                games,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalGames / limit),
                    totalGames
                }
            },
            "Player match history collection compiled successfully"
        )
    );
});

// GET DETAILED MATCH REPORT
//   Fetches a deep scoreboard configuration for a specific game by its Unique Mongo ID.

const getMatchReport = asyncHandler(async (req, res) => {
    const { gameResultId } = req.params;

    if (!gameResultId) {
        throw new ApiError(400, "Game Result Database Identifier is required");
    }

    const report = await GameResult.findById(gameResultId)
        .populate("room", "title startedAt endedAt") 
        .populate("winner", "username fullName avatar")
        .populate({
            path: "leaderboard.player",
            select: "username avatar" 
        });

    if (!report) {
        throw new ApiError(404, "Match archival record not found in system history");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, report, "Detailed post-game report generated successfully"));
});

export {
    getMatchReport,
    getUserGameHistory
}
