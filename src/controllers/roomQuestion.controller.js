import { RoomQuestion } from "../models/roomQuestion.model.js";
import { Room } from "../models/room.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Maps an array of question IDs to an active room lobby with strict sequence ordering.
 */
const setupRoomQuestions = asyncHandler(async (req, res) => {
    const hostId = req.user?._id;
    const { roomId, questionIds } = req.body; // Expects an array: { "roomId": "...", "questionIds": ["id1", "id2"] }

    if (!roomId) {
        throw new ApiError(400, "Active Room ID is required to map question sets");
    }

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        throw new ApiError(400, "Please provide a non-empty array of question IDs to initialize the game loop");
    }

    const activeRoom = await Room.findOne({ _id: roomId, host: hostId, status: "waiting" });
    if (!activeRoom) {
        throw new ApiError(403, "Unauthorized: Only the original lobby host can initialize question sequences");
    }

    const mappingPayload = questionIds.map((qId, index) => {
        return {
            room: roomId,
            question: qId,
            sequenceNumber: index + 1 // Index 0 becomes Sequence 1, Index 1 becomes Sequence 2, etc.
        };
    });

    const assignedSequence = await RoomQuestion.insertMany(mappingPayload);

    return res
        .status(201)
        .json(
            new ApiResponse(
                201, 
                { count: assignedSequence.length, room: roomId }, 
                "Game timeline sequence successfully generated and bound to lobby"
            )
        );
});


export {
    setupRoomQuestions,
}
