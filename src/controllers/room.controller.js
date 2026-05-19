import { Room } from "../models/room.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateUniqueRoomCode } from "../utils/roomHelper.js";
import { User } from "../models/user.model.js";

const createRoom = asyncHandler(async(req , res)=> {
    // host -> req.user?._id
    // title , maxPlayer  -> req.body
    // generate room code using roomHelper utility
    // create room document 
    // return room document with room code

    const hostId = req.user?._id

    if(!hostId){
        throw new ApiError(404 , "Host does not found")
    }

    const {title , maxPlayers} = req.body

    if(!title || title.trim()===""){
        throw new ApiError(400 , " Title is missing")
    }

    if(!maxPlayers){
        throw new ApiError(400 , "maxPlayers details is required")
    }

    const roomCode = await generateUniqueRoomCode();

    if(!roomCode){
        throw new ApiError(500 , "Critical internal server error while allocating secure room code")
    }

    const room = await Room.create({
        title : title.trim(),
        host : hostId,
        roomCode,
        maxPlayers : maxPlayers || 20,
        status: "waiting"
    })


    return res
    .status(201)
    .json(
        new ApiResponse(
            201 , room , "Room created successfully!"
        )
    )



})

const joinRoom = asyncHandler(async(req , res) => {
    // roomCode -> req.body
    // check is room exists with that roomCode and has waitinig status
//     if yes then move to sockets to join the looby

    const { roomCode } = req.body;

    if (!roomCode || roomCode.trim().length !== 6) {
        throw new ApiError(400, "Valid 6-digit room code is required");
    }

    const room = await Room.findOne({ 
        roomCode: roomCode.toUpperCase(), 
        status: "waiting" 
    });

    if (!room) {
        throw new ApiError(404, "Room not found or game has already started");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, room, "Room code validated. Proceed to WebSocket connection."))
})

const abortRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.body;
    const hostId = req.user?._id;

    // Security Check: Only the original host can close their own room
    const room = await Room.findOne({ _id: roomId, host: hostId });
    if (!room) throw new ApiError(403, "Unauthorized: Only the host can terminate this lobby");

    await Room.findByIdAndDelete(roomId); 
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Lobby closed successfully"));
});

const getRoomDetails = asyncHandler(async (req, res) => {
    const { roomCode } = req.params;

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase(), status: "waiting" });
    if (!room) throw new ApiError(404, "Active room session not found");

    return res
    .status(200)
    .json(new ApiResponse(200, room, "Room details found successfully"));
});

const getActiveRooms = asyncHandler(async (req, res) => {
    // Frontend se page aur limit ki query params nikaalna (with defaults)
    // Example URL: /api/v1/rooms/active?page=1&limit=10
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Safety check: Agar frontend koi galat values bhej de
    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Page and limit parameters must be positive integers");
    }

    //  Calculate skip factor (Mongoose ko kitne documents skip karne hain)
    const skip = (page - 1) * limit;

    //  Database Query (Filter: status must be "waiting")
    // Hum pehle count nikaalenge taaki frontend ko bata sakein ki total kitne pages hain
    const totalActiveRooms = await Room.countDocuments({ status: "waiting" });

    // Fetch the paginated rooms lists
    const rooms = await Room.find({ status: "waiting" })
        .populate("host", "username avatar") // Host ki basic details join karne ke liye
        .sort({ createdAt: -1 }) // Naye rooms sabse upar dikhane ke liye
        .skip(skip)
        .limit(limit);

    //  Calculate Pagination Metadata
    const totalPages = Math.ceil(totalActiveRooms / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Return response  with clear structure
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                rooms,
                pagination: {
                    currentPage: page,
                    totalPages,
                    limit,
                    totalRooms: totalActiveRooms,
                    hasNextPage,
                    hasPrevPage
                }
            },
            "Active public lobbies fetched successfully with pagination"
        )
    );
});


export {
    createRoom,
    joinRoom,
    abortRoom,
    getRoomDetails,
    getActiveRooms
}