import mongoose  from "mongoose";

const roomQuestionSchema = new mongoose.Schema({
    room :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Room",
        required : true
    },
    question : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Question",
        required : true

    },
    sequenceNumber : {
        type : Number,
        required : true,
        min : 1,
    }
},{timestamps:true})


roomQuestionSchema.index({ room: 1 });

roomQuestionSchema.index({
    room : 1,
    sequenceNumber : 1
},{
    unique: true
})

export const RoomQuestion = mongoose.model("RoomQuestion" , roomQuestionSchema)