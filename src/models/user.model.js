import mongoose from "mongoose";
import bcrypt from "bcrypt" ;
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase : true,
      index : true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
        type : String,
        required : true,
        trim: true,
        lowercase : true,
        unique: true
    },
    fullName : {
        type : String,
        required : true,
        trim : true,   
        index : true  
    },
    password: {
      type: String,
      required: [true,"password is required"],
      minlength: 8,
      select: false, // never return password in queries
    },
    avatar : {
        url :{
            type :String,
            // required : true
        },
        public_id :{
            type :String,
            // required : true
        },
    },
    refreshToken :{
        type : String,
        select : false
    },
    isVerified : {
        type : Boolean , //Boolean flag for email verification
        default : false
    }
},{timestamps:true})

userSchema.pre("save" , async function(){
    if(!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password , 10)
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password , this.password)
    
}


userSchema.methods.generateAccessToken = async function() {
    const accessToken = await jwt.sign(
        {
            _id: this._id,
            email:this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )

    console.log(`\n access token at model ${accessToken} `);
    
    return accessToken;
    
}

userSchema.methods.generateRefreshToken = async function(){
    const refreshToken = await  jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRY
        }
    )
    console.log(`\n refresh token at model ${refreshToken}`);
    return refreshToken;
    
}


export const User = mongoose.model("User" , userSchema)




