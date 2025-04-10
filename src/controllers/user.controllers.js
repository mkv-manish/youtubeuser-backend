import {asyncHandler} from "../utils/asyncHeandler.js"
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uplodOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        //small check for user existence
       const accessToken =  user.generateAccessToken()
       const refreshToken =  user.generateRefreshToken()
    
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})
       return {accessToken, refreshToken}
    } catch (error) {
       throw new ApiError(500, "Somthing went wrong while generating access and refresh tokens")

    }
}

const registerUser = asyncHandler( async (req, res) => {
    const { fullname, email, username, password} = req.body


    // validation
    if([fullname, username, email, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser= await User.findOne({
        $or: [{ username}, {email}]
    })

    if (existedUser) {
         throw new ApiError(409, "User with email or username already exists")
    }
    console.warn(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")  
    }

    // const avatar = await uplodOnCloudinary(avatarLocalPath)
    // let coverImage = ""
    // if (coverLocalPath) {
    // coverImage = await uplodOnCloudinary(coverImage)

    // }

    let avatar;
    try {
        avatar = await uplodOnCloudinary(avatarLocalPath)
        console.log("Uploading avatar", avatar)
    } catch (error) {
        console.log("Error uploading avatar", error)
        throw new ApiError(500, "Failed to upload avater")  
   
    }
    let coverImage;
    try {
        coverImage = await uplodOnCloudinary(coverLocalPath)
        console.log("Uploading coverImage", coverImage)
    } catch (error) {
        console.log("Error uploading coverImage", error)
        throw new ApiError(500, "Failed to upload coverImager")  
   
    }


     try {
        const user = await User.create({
           fullname,
           avatar: avatar.url,
           coverImage: coverImage?.url || "",
           email,
           password,
           username: username.toLowerCase()
       }) 
   
       const createdUser = await User.findById(user._id).select(
           "-password -refereshToken"
       )
   
       if (!createdUser) {
             throw new ApiError(500, "Something went wrong while registering  a user")  
         
       }
       return res
       .status(201)
       .json(new ApiResponse(200, createdUser, "User registed successfully"))
     } catch (error) {
        console.log("User Creation Failed")

        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }
         throw new ApiError(500, "Something went wrong while registering  a user and images were deleted ")  

     }

})

const loginUser = asyncHandler(async (req, res) => {
    // get data from body 
    const { email, username, password} = req.body

    // validation
    if (!email) {
     throw new ApiError(400, "Email is required")

    }
    const user = await User.findOne({
        $or: [{ username}, {email}]
    })

    if (!user) {
         throw new ApiError(400, "User not found")
    
    }
    // validate password

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid credentials")
    
    }
    const { accessToken, refreshToken} = await
    generateAccessAndRefereshToken(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200,
        {user: loggedInUser, accessToken, refreshToken},
        "User logged in successfully"
     ))

})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
           $set: {
            refereshToken: undefined
           } 
        },
        {
            new: true
        }
    )

    const options = {
             httpOnly: true,
             secure: process.env.NODE_ENV === "production",
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json( new ApiResponse(200, {},  "User logged out sucessfully"))

})


const refereshAccessToken = asyncHandler(async (req, res) => {
    const  incomingRefrehsoken = req.cookies.refreshToken || 
    req.body.refreshToken 

    if(!incomingRefrehsoken) {
     throw new ApiError(400, "Refresh token is required")
    
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefrehsoken,
            process.env.REFRESH_TOKEN_SECRET,
        )
        const user = await User.findById(decodedToken?._id)

        if(!user) {
          throw new ApiError(401, "Invalid refresh token")
        }
        if (incomingRefrehsoken !== user?.refreshToken) {
         throw new ApiError(401, "Invalid refresh token")

        }
        const options = {
             httpOnly: true,
             secure: process.env.NODE_ENV === "production",
        }
        const {accessToken, refreshToken: newRefreshToken}= 
        await generateAccessAndRefereshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(
            200, 
            {
                accessToken,refreshToken: newRefreshToken
            }, 
            "Access token refreshed successfully"
        ));

    } catch (error) {
         throw new ApiError(500, 
            "Somthing went wrong while refreshing access token")

    }
})


const changeCurrentPassword = asyncHandler (async (req, res ) => {
    
    const {oldPassword, newPassword} =req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect
    (oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(401, "Old password is incorrect") 
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, 
        "Password changed successfully"))


})


const getCurrentUser = asyncHandler (async (req, res ) => {
    return res.status(200).json( new ApiResponse(200, req.user
        , "Current user details"
    ))

})

const updateAccountDetails = asyncHandler (async (req, res ) => {

    const {fullname, email} = req.body 

    if (!fullname ) {
        throw new ApiError(400, "Fullname is required");
        
    }

    if (!email ) {
        throw new ApiError(400, "Email is required");
        
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password -refreshToken")

     return res.status(200).json( new ApiResponse(200, user
        , "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler (async (req, res ) => {

    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, " File is required")
        
    }
    const avatar = await uplodOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, 
        "Something went wrong while uploading avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200, user
        , "Avatar updated successfully"
    ))

})

const updateUserCoverImage = asyncHandler (async (req, res ) => {

    const coverImageLocalPath = req.files?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, " File is required")
        
    }
    const coverImage = await uplodOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, 
        "Something went wrong while uploading coverImage")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200, user
        , "Cover image updated successfully"
    ))

  

})


const getUserChannelProfile = asyncHandler( async (req, res) => {
   
   const {username} = req.params 
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "susbcriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "susbcribers"
                }
            },{
                $lookup: {
                    from: "susbcriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscriberedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$susbcribers"
                    },
                    channelSubscribedToCount: {
                        $size: "subscriberedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id, "$subcribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                // Project only the necessary data
                $project: {
                    fullname:1,
                    username:1,
                    avatar: 1,
                    subscribersCount:1,
                    channelSubscribedToCount:1,
                    isSubscribed:1,
                    email:1,
                    coverImage:1,

                }
            }
        ]
    )

    if (!channel?.length) {
        throw new ApiError(404, "Chanel not found")
        
    }
    return res.status(200).json(new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully"
    ))
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
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

    return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory,
        "Watch history fetched successfully"
    ))
})


export {
    registerUser,
    loginUser,
    refereshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getWatchHistory,
    getUserChannelProfile
}