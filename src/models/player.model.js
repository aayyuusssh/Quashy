import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
    user:{
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    room:{
        type : mongoose.Schema.Types.ObjectId,
        ref: "Room"
    },
    isHost: {
        type:Boolean,
        default: false,

    },
    score: {
        type : Number,
        default : 0,
    },
    status: {
        type:  String,
        enum: ["active" , "disconnected" ,"left"],
        default : "active"
    },
    joinedAt: {
        type: Date,
        default : Date.now
    }

},{timestamps: true})


playerSchema.index({
    room : 1,
    user : 1
},{unique:true})
// This prevents duplicate player entries for the same user in a room.


export const Player = mongoose.model("Player" , playerSchema) 