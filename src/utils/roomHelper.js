import crypto from "crypto";
import { Room } from "../models/room.model.js";
import { ApiError } from "./ApiError.js";


export async function generateUniqueRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let code = "";
    
    const bytes = crypto.randomBytes(6); 
    
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }

    const isCodeTaken = await Room.findOne({
      roomCode: code,
      status: { $in: ["waiting", "active"] }
    });

    if (!isCodeTaken) {
      return code;
    }

    attempts++;
  }

  throw new ApiError(404,"Server was unable to allocate a unique room code. Please try again.");
}
