import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    roomCode: {
        type : String,
        required : true,
        index: true,
        maxlength : 6,
        minlength: 6,
        uppercase: true
    },
    host : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    title : {
        type : String,
        trim : true,
        required : true,
        maxlength : 40
    },
    status : {
        type : String,
        enum: ["waiting" , "active" ,"finished"],
        required : true,
        default : "waiting"
    },
    maxPlayers : {
        type : Number,
        default : 20,


    },
    startedAt : {
        type : Date,
        default : Date.now
    },
    endedAt : {
        type : Date,
    },

} , {
    timestamps: true
})

roomSchema.index(
    { roomCode : 1},
    {
        unique: true,
        partialFilterExpression : {status : {$in : ["waiting" , "active"]}}
    }
)

export const Room = mongoose.model("Room" , roomSchema);