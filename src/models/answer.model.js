import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
    room:{
        type: mongoose.Schema.Types.ObjectId,
        ref :"Room",
        required : true
    },
    player:{
        type: mongoose.Schema.Types.ObjectId,
        ref :"Player",
        required : true
    },
    question:{
        type: mongoose.Schema.Types.ObjectId,
        ref :"Question",
        required : true
    },
    submittedAnswer : {
        type : String,
        required: true,
        trim : true
    },
    isCorrect :{
        type : Boolean , 
        required: true,
        default : false,
    },
    serverReceiveTime : {
        type : Date,
        default : Date.now
    },
    responseTimeMs :{
        type : Number,
        required: true 
    },
},{timestamps: true})


answerSchema.index(
    {
        room:1,
        player:1,
        question: 1
    },{
        unique: true
    }
)

export const Answer = mongoose.model("Answer",answerSchema)