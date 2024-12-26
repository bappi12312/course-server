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
import {CourseProgress} from "../models/courseProgress.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getCourseProgress = asyncHandler(async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!isValidObjectId(courseId)) {
            throw new ApiError(400, "invalid course id");
        }
        const courseProgress = await CourseProgress.findOne({ courseId,req.user._id }).populate({path: "courseId"});

        const courseDetails = await Course.findById(courseId).populate("lectures")

        if (!courseDetails) {
          return res.status(404).json({
            message: "Course not found",
          });
        }

        if (!courseProgress) {
          return res.status(200).json({
            data: {
              courseDetails,
              progress: [],
              completed: false,
            },
          });
        }
        return res.status(200).json({
          data: {
            courseDetails,
            progress: courseProgress.lectureProgress,
            completed: courseProgress.completed,
          },
        });
    } catch (error) {
        throw new ApiError(400, error?.message, "error ");
    }
});
 
    

 