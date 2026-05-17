import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    questionText:{
        type : String,
        required:  true,
        trim: true
    },
    options:[ 
        {
             optionId: {
                type: String,
                required: true
            },
            text: {
                type: String,
                required: true,
                trim: true
            }
        }
    ],
    correctAnswer:{
        type: String,
        required : true
    },
    duration:{
        type:Number,
        required : true,
        default : 30
    },
    category: {
        type:String,
        required: false,
        trim: true,
        lowercase: true
    },
    difficulty: {
        type:String,
        enum:["easy" ,"medium" , "hard"],
        default :"easy"
    },
    explanation : {
        type:String,
        trim : true
    },

    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User",
        required : true
    },
},{timestamps:true})


questionSchema.index({category: 1 });
questionSchema.index({createdBy : 1})

export const Question = mongoose.model("Question" , questionSchema)