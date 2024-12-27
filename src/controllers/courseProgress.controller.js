// if(!isValidObjectId(courseId))
//   throw new ApiError(400,"invalid course id");

// return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         {lecture},
//         "lecture created successfully"
//       )
//     )

import { isValidObjectId } from "mongoose";
import { Course } from "../models/course.model.js";
import { CourseProgress } from "../models/courseProgress.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const getCourseProgress = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      throw new ApiError(400, "invalid course id");
    }
    const courseProgress = await CourseProgress.findOne({ courseId, userId: req.user._id }).populate({ path: "courseId" });

    const courseDetails = await Course.findById(courseId).populate("lectures")

    if (!courseDetails) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    if (!courseProgress) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            courseDetails,
            progress: [],
            completed: false,
          },
          "Course progress not found"
        )
      );
    }
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          courseDetails,
          progress: courseProgress.lectureProgress,
          completed: courseProgress.isCompleted,
        },
        "Course progress found"
      )
    )
  } catch (error) {
    throw new ApiError(400, error?.message, "error ");
  }
})

const updateLectureProgress = asyncHandler(async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    if (!isValidObjectId(courseId) || !isValidObjectId(lectureId)) {
      throw new ApiError(400, "invalid course id or lecture id");
    }

    const userId = req.user?._id;

    // fetch or create course progress
    let courseProgress = await CourseProgress.findOne({ courseId, userId })
    if (!courseProgress) {
      courseProgress = await CourseProgress.create({
        userId,
        courseId,
        isCompleted: false,
        lectureProgress: []
      })
    }

    // check if lecture progress exists
    const lectureIndex = courseProgress.lectureProgress.findIndex(
      (lecture) => lecture.lectureId === lectureId
    )
    if (lectureIndex !== -1) {
      // if lecture progress exists, update it
      courseProgress.lectureProgress[lectureIndex].isCompleted = true;
    } else {
      // if lecture progress does not exist, create it
      courseProgress.lectureProgress.push({
        lectureId,
        isCompleted: true
      })
    }

    // check if all lectures have been viewed
    const lectureProgressLength = courseProgress.lectureProgress.filter(
      (lecture) => lecture.isCompleted === true
    ).length;

    const course = await Course.findById(courseId);
    if (course.lectures.length === lectureProgressLength) {
      courseProgress.isCompleted = true;
    }

    await courseProgress.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "lecture progress updated successfully"
      )
    );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, error?.message, "error updating lecture progress");
  }
})


const markAsCompleted = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      throw new ApiError(400, "invalid course id");
    }
    const userId = req.user?._id;
    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress) {
      throw new ApiError(404, "course progress not found");
    }
    courseProgress.lectureProgress.map(
      (lecture) => (lecture.isCompleted = true)
    )
    courseProgress.isCompleted = true;
    await courseProgress.save();
    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "course marked as completed",
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message, "error marking course as completed");
  }
})

const markAsIncompleted = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      throw new ApiError(400, "invalid course id");
    }
    const userId = req.user?._id;
    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress) {
      throw new ApiError(404, "course progress not found");
    }
    courseProgress.lectureProgress.map(
      (lecture) => (lecture.isCompleted = false)
    )
    courseProgress.isCompleted = false;
    await courseProgress.save();
    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "course marked as incompleted",
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message, "error marking course as incompleted");
  }
})

export {
  getCourseProgress,
  updateLectureProgress,
  markAsCompleted,
  markAsIncompleted,
}