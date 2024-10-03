import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true // optimise for searching
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true // optimise for searching
    },
    // avatar: {
    //     type: String, // cloudinary url
    //     required: true,
    // },
    avatar: {
        type: {
            public_id: String,
            url: String //cloudinary url
        },
        required: true
    },
    coverImage: {
        // type: String, // cloudinary url
        type: {
            public_id: String,
            url: String //cloudinary url
        },
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Video'
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required!']
    },
    refreshToken: {
        type: String
    }
}, {timestamps: true})

// its middleware pre hook which will eun just before the save 
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// custom hooks
userSchema.methods.isPasswordCorrect = async function (password) {
    // it takes two values is current pass(password) & another one is encrypted pass(this.password)
    return await bcrypt.compare(password, this.password)
}

// create jwt tokens
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        // playload
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        // playload
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User', userSchema)