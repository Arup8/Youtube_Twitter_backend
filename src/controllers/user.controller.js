import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// const registerUser = asyncHandler( async (req, res) => {
//     res.status(200).json({
//         message: "ok"
//     })
// })

// create a method to generate access & refresh tokens -->
const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken() // those are method
        const refreshToken = user.generateRefreshToken() // those are method

        // now save that refresh token only in DB
        user.refreshToken = refreshToken
        // now save that but in model there are too much validation check so then
        await user.save({ validateBeforeSave: false }) // validateBeforeSave: false this means it make false every validation

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, ":( Something went wrong while generating refresh & access token!")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // steps ->
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password & refresh token field from response
    // check for user creation
    // return response

    // 1. get user details which are come from request.body(only when data come through json or form) but for url it will be diff
    const {fullName, email, username, password} = req.body
    // console.log("email: ",email);
    
    // 2. validation - not empty

    // if(fullName === "") {
    //     // in ApiError there is 400 is status code & another one is message
    //     throw new ApiError(400, "Fullname is required!")
    // }

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "") // it basically check if field exists then apply trim on that then after applying the trim if there is still empty then it will return true
    ){
        throw new ApiError(400, ":( All fields are required!")
    }
    // Btw you can add more checks here 

    // 3. check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]  // use checks means pass the parameters on which basis you want to check
    })

    if (existedUser) {
        throw new ApiError(409, ":( User with email or username already exists!")
    }

    // console.log(req.files);
    

    // 4. check for images, check for avatar
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path
    }

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, ":( Avatar file is required!")
    }

    // 5. upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // check
    if(!avatar) {
        throw new ApiError(400, ":( Avatar file is required!")
    }

    // 5. create user object - create entry in db
    const user = await User.create({
        fullName,
        // avatar: avatar.url,
        // coverImage: coverImage?.url || "", // here actually we need to check fro coverImage cause wwe didn't write the if statement for coverIamge but for avatar so for avatar we don't need check
        avatar: {
            public_id: avatar.public_id,
            url: avatar.secure_url
        },
        coverImage: {
            public_id: coverImage?.public_id || "",
            url: coverImage?.secure_url || ""
        },
        email,
        password,
        username: username.toLowerCase()
    })

    // now check that User is created or not & mongodb by default for every entry it add a id so we will find by that _id
    // const createdUSer = await User.findById(user._id)
    
    // 6. remove password & refresh token field from response & also check user is created or not
    const createdUSer = await User.findById(user._id).select(
        "-password -refreshToken" // -password here - meanse remove that field
    )
    // 7. check for user creation
    if(!createdUSer) {
        throw new ApiError(500, ":( Something went wrong while registering the user!")
    }

    // 8. return response
    // return res.status(201).json({createdUSer})
    return res.status(201).json(
        new ApiResponse(200, createdUSer, ":) User registered Successfully!")
    )
    
})

const loginUser = asyncHandler(async (req, res) => {
    // steps ->
    // get data from req body
    // access by username or email
    // find the user
    // password check
    // genereate access & refresh token
    // send cookie
    // return response

    // 1. get data from req body
    const {email, username, password} = req.body
    
    // if(!(username || email)){
    //     throw new ApiError(400, ":( Username or email is required!")
    // }

    if(!username && !email){
        throw new ApiError(400, ":( Username and email is required!")
    }

    // 2. access by username or email & find the user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(400, ":( User does not exist!")
    }

    // 3. password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(400, ":( Invalid user credentials!")
    }
    
    // 4. genereate access & refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    // 5. send cookie
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // you have to set some options here that those cookies can't be modified through frontend but can be modify by backend
    const options = {
        httpOnly: true,  // means that this cookie can't be modified through frontend
        secure: true, // means that this cookie can only be accessed through https
        sameSite: "None" // important for deployment
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options) // "accessToken" is key & accessToken is value
    .cookie("refreshToken", refreshToken, options)
    // basically we will send json format data at last cause user need to save the data in localstorage or anywhere or if he/she use mobile application then
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken 
            },
            ":) User logged In Successfully!" // message
        )
    )


})

const logoutUser = asyncHandler(async(req, res) => {
    // steps -->
    // 1st create a middleware to verifyJWT means to access those tokens
    // then in router before logout inject that middleware 
    // then find the user id from db by doing next step
    // then here get the id using req.user._id (this reason was described in auth.middleware.js)

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        // {
        //     $set: {
        //         refreshToken: undefined
        //     }
        // },
        {
            new: true
        }
    )

    // now clear the cookies
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None" // important for deployment
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, ":) User logged out!"))


})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // first access refresh token from cookies or anywhere
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, ":( Unauthorized request!")
    }

    try {
        // now verify the incomingRefreshToken with db stored refreshToken
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        // now find the user by using the decodedToken
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, ":( Invalid refresh token!")
        }
    
        // now check the incomingRefreshToken with saved refreshToken which we saved during creation of method generateAccess&RefreshTokens await user.save({ validateBeforeSave: false })
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, ":( Refresh token is expired or used!")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "None" // important for deployment
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                ":) Access token refreshed!"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || ":( Invalid refresh token!")
    }


})


const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    // basically to check that the new pass is same with confirm pass   

    // const {oldPassword, newPassword, confirmPassword} = req.body

    // if(!(newPassword === confirmPassword)){
    //     // thrwo an error
    // }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, ":( Invalid old password!")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, ":) Password changed succesfully!"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    // console.log('Request received for current user');
    // console.log('Cookies:', req.cookies);
    return res
    .status(200)
    // .json(200, req.user, ":) Current user fetched succesfully!")
    .json(new ApiResponse(200, req.user, ":) Current user fetched succesfully!"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, ":( All fields are required!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                // fullName : fullName,
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, ":) Account details updated successfully!"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path // here we didn't use req.files cause here we need only one pic so req.file    

    if(!avatarLocalPath){
        throw new ApiError(400, ":( Avatar file is missing!")
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath)

    // if(!avatar.url){
    //     throw new ApiError(400, ":( Error while uploading on avatar!")
    // }

    // const user = await User.findByIdAndUpdate(
    //     req.user?._id,
    //     {
    //         $set: {
    //             avatar: avatar.url
    //         }
    //     },
    //     {new: true}
    // ).select("-password")

    // return res
    // .status(200)
    // .json(
    //     new ApiResponse(200, user, ":) Avatar updated successfully!")
    // )

    // TODO: delete old avatar from cloudinary
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, ":( Error while uploading avatar");
    }

    const user = await User.findById(req.user._id).select("avatar");

    // const avatarToDelete = user.avatar.public_id;
    const avatarToDelete = user.avatar ? user.avatar.public_id : null;

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    public_id: avatar.public_id,
                    url: avatar.secure_url
                }
            }
        },
        { new: true }
    ).select("-password");

    if (avatarToDelete && updatedUser.avatar.public_id) {
        await deleteOnCloudinary(avatarToDelete);
    }


    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, ":) Avatar update successfull")
        )

})


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path // here we didn't use req.files cause here we need only one pic so req.file

    if(!coverImageLocalPath){
        throw new ApiError(400, ":( Cover image file is missing!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, ":( Error while uploading on cover image!")
    }

    // const user = await User.findByIdAndUpdate(
    //     req.user?._id,
    //     {
    //         $set: {
    //             coverImage: coverImage.url
    //         }
    //     },
    //     {new: true}
    // ).select("-password")

    //TODO: delete old cover image from cloudinary

    const user = await User.findById(req.user._id).select("coverImage");

    const coverImageToDelete = user.coverImage ? user.coverImage.public_id : null;

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: {
                    public_id: coverImage.public_id,
                    url: coverImage.secure_url
                }
            }
        },
        { new: true }
    ).select("-password");

    if (coverImageToDelete && updatedUser.coverImage.public_id) {
        await deleteOnCloudinary(coverImageToDelete);
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedUser, ":) Cover Image updated successfully!")
    )

})

// aggreagation pipeline
const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params
    
    if(!username.trim()){
        throw new ApiError(400, ":( Username is missing!")
    }

    // pipelines can be written like {},{},{} like this way so form here its has 3 pipekines
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions", // this is the collection name in lowercase & in plural form
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions", // this is the collection name in lowercase & in plural form
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]}, // this $in is used for object & array both
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $project: {
                fullName: 1, // add 1 to get those fields & add 0 to not get those fields
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, ":( Channel does not exist!")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], ":) Channel profile fetched successfully!")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                // _id: req.user?._id // this is not working
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [ 
                // basically in this pipeline you are in videos collection
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [ 
                            // basically we create this pipeline cause from owner field we need only fullName & username & avatar not other things
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, ":) Watch history fetched successfully!")
    )   
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}