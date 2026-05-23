import mongoose from "mongoose";

const gameResultSchema = new mongoose.Schema({
    room :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Room",
        required : true,
    },
    winner :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    leaderboard : [
        {
            player : {
                type : mongoose.Schema.Types.ObjectId,
                ref : "User",
                required: true
            },
            finalScore : {
                type : Number,
                required : true
            },
            rank : {
                type : Number,
                required : true
            }
        }
    ],
    totalQuestions : {
        type : Number,
        required : true
    },
    finishedAt :{
        type : Date,
        default : Date.now
    }
},{timestamps:true})


gameResultSchema.index({ winner: 1 });

export const GameResult = mongoose.model("GameResult" , gameResultSchema)