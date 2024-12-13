import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyJWT } from "../middlewares/auth.middleware";
import jwt from "jsonwebtoken"
import { deleteMediaFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";
import { json, response } from "express";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)

    const accessToken = user?.generateAccessToken()
    const refreshToken = user?.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "somthing went wrong while generating access token and refresh token")
  }
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, 'all fields are required')
  }

  try {
    const existedUser = await User.findOne({
      $or: [{ email }]
    })

    if (existedUser) {
      throw new ApiError(400, 'user already exists')
    }

    const photoUrlLocalPath = req.files?.photoUrl[0].path;

    // if error happend then this code wille be visible

    // let photoUrlLocalPath;
    // if(req.files && Array.isArray(req.files?.photoUrl) && req.files.photoUrl.length > 0) {
    //   photoUrlLocalPath = req.files.photoUrl[0].path;
    // }

    if (!photoUrlLocalPath) {
      throw new ApiError(400, "photo url is required")
    }
    const photoUrl = await uploadOnCloudinary(photoUrlLocalPath)

    if (!photoUrl) {
      throw new ApiError(400, "photo url is required")
    }

    const user = await User.create({
      name,
      email,
      password,
      photoUrl: photoUrl.url,
    })

    const createdUser = await User.findById(user?._id).select("-password -refreshToken")
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
      new ApiResponse(200, createdUser, "user registered successfully")
    )
  } catch (error) {
    throw new ApiError(500, error?.message, "faild to register")
  }
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "all feildes must be required");
  }

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new ApiError(400, "user not found");
    }

    const isPasswordCorrect = user.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
      throw new ApiError(400, "password incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user?._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser, accessToken, refreshToken
          },
          "user logged in successfully"
        )
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "logging in failed")
  }
})

const logout = asyncHandler(async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1
        }
      },
      {
        new: true,
      }
    )

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
      .status(200)
      .clearCookie('accessToken', options)
      .clearCookie('refreshToken', options)
      .json(
        new ApiResponse(
          200,
          {}, "user logout successfully"
        )
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "error while logging out")
  }
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token expired or used")
    }
    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password -refreshToken").populate("enrolledCourses")
    if (!user) {
      return res.status(404).json({
        message: "Profile not found",
        success: false
      })
    }

    return res.status(200).json(
      new ApiResponse(200, { user }, 'get user profile')
    )
  } catch (error) {
    throw new ApiError(500, error?.message, "error getting user")
  }
})


const updateProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;
    const photoUrlLocalPath = req.files?.photoUrl[0].path;

    if (!photoUrlLocalPath) {
      throw new ApiError(400, "photoUrlLocalPath is required")
    }

    const user = await User.findById(userId).select("-password -refreshToken")
    if (!user) {
      throw new ApiError(400, "user not found");
    }

    if (user.photoUrl) {
      const publicId = user.photoUrl.split("/").pop().split(".")[0]
      deleteMediaFromCloudinary(publicId)
    }
    const photoUrl = await uploadOnCloudinary(photoUrlLocalPath)
    if (!photoUrl) {
      throw new ApiError(400, "photoUrl cannot be empty")
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        photoUrl: photoUrl?.path,
        name
      },
      {
        new: true
      }
    )

    return res
    .status(200)
    .json(
      new ApiError(
        200,
        {
          updatedUser
        },
        "profile updated successfully"
      )
    )

  } catch (error) {
    throw new ApiError(500,error?.message,"error updating profile")
  }
})

export {
  generateAccessTokenAndRefreshToken,
  register,
  login,
  logout,
  refreshAccessToken,
  getUserProfile,
  updateProfile
}
