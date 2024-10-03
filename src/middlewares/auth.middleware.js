import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// export const verifyJWT = asyncHandler(async(req, res, next) => {
//     try {
//         // for logout to get the access token first from req cause in app.js we use app.use(cookieParser()) so for that req have access of cookie
//         const token = req.cookies?.accessToken || req.header("Authorisation")?.replace("Bearer ", "")
    
//         if(!token){
//             throw new ApiError(401, ":( Unauthorized request!")
//         }
    
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
//         if(!user){
//             throw new ApiError(401, ":( Inavlid Access Token!")
//         }
    
//         req.user = user;
//         next()
//     } catch (error) {
//         throw new ApiError(401, error?.message || ":( Inavlid access token!")
//     }

// })

// actually same code but here we didn't use res so we remove that & use _ 
export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        // for logout to get the access token first from req cause in app.js we use app.use(cookieParser()) so for that req have access of cookie
        const token = req.cookies?.accessToken || req.header("Authorisation")?.replace("Bearer ", "")
    
        if(!token){
            throw new ApiError(401, ":( Unauthorized request!")
        }
        
        // now verify the token with db stored accessToken
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, ":( Inavlid Access Token!")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || ":( Inavlid access token!")
    }

})