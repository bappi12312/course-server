import { isValidObjectId } from "mongoose";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteMediaFromCloudinary, uploadOnCloudinary, deleteVideoFromCloudinary } from "../utils/cloudinary.js";


const createCourse = asyncHandler(async (req, res) => {
  const { courseTitle, courseDescription, coursePrice } = req.body;
  if (!courseTitle || !courseDescription || !coursePrice) {
    throw new ApiError(400, "all fields are required")
  }

  try {
    const course = await Course.create({
      courseTitle,
      courseDescription,
      coursePrice,
      instructorId: req.user?._id,
    })

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { course },
          "course created successfully"
        )
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "error creating course")
  }
})

const searchCourse = asyncHandler(async (req, res) => {
  try {
    const { query = "", categories = [], sortByPrice } = req.query;

    const searchCriteria = {
      isPublished: true,
      $or: [
        { courseTitle: { $regex: query, $options: "i" } },
        { subTitle: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } }
      ]
    }

    if (categories.length > 0) {
      searchCriteria.category = { $in: categories }
    }

    const sortOptions = {}
    if (sortByPrice === "low") {
      sortOptions.coursePrice = 1;//sort by price in ascending
    } else if (sortByPrice === "high") {
      sortOptions.coursePrice = -1;//sort by price in ascending
    }

    const courses = await Course.find(searchCriteria).populate({path: "instructorId", select: "name photoUrl"}).sort(sortOptions)


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            courses: courses || []
          }
        )
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "error searching courses")
  }
})

const getpublishedCourse = asyncHandler(async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).populate({ path: "instructorId", select: "name photoUrl" })

    if (!courses) {
      return res.status(404).json({
        message: "Course not found"
      })
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { courses }, "get published course successfully")
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "error getting published course")
  }
})

const getInstructorCourses = asyncHandler(async (req, res) => { 
  const instructorId = req.user._id;
  try {
    const courses = await Course.find({ instructorId })
    if (!courses) {
      throw new ApiError(400, "courses not found")
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { courses },
          "get instructor course found successfully"
        )
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "error getting instructor courses")
  }
})

const editCourse = asyncHandler(async (req, res) => {
  const {courseId} = req.params;
  const { courseTitle, courseDescription, coursePrice } = req.body;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  try {
    let course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(400, "courseId not found")
    }

    let courseThumbnail;
    if (thumbnailLocalPath) {
      if (course.courseThumbnail) {
        const publicId = course.courseThumbnail.split('/').pop().split(".")[0]
        await deleteMediaFromCloudinary(publicId)
      }

      courseThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    }

    const updateData = { courseTitle, courseDescription, coursePrice, courseThumbnail: courseThumbnail?.url }

    course = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      {
        new: true,
      }
    )

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { course },
          "edit course successfully"
        )
      )
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to create course"
    })
  }
})

const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidObjectId(courseId)) {
    throw new ApiError(400, "invalid courseid")
  }
  try {
    const course = await Course.findById(courseId)
    if (!course) {
      throw new ApiError(400, "course not found")
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { course },
          "get course successfully"
        )
      )
  } catch (error) {
    throw new ApiError(500, error?.message, "error getting single course")
  }
})

const createLecture = asyncHandler(async (req, res) => {
  const { lectureTitle } = req.body;
  const { courseId } = req.params;
  if (!isValidObjectId(courseId))
    throw new ApiError(400, "invalid course id");

  if (!lectureTitle || !courseId) {
    throw new ApiError(400, "lecture title and course id is required");
  };

  try {
    const lecture = await Lecture.create({ lectureTitle })

    const course = await Course.findById(courseId)
    if (course) {
      course.lectures.push(lecture._id)
      await course.save({ validateBeforeSave: false });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { lecture },
          "lecture created successfully"
        )
      )
  } catch (error) {
    throw new ApiError(400, error?.message, "error ");
  }
})

const getCourseLecture = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      throw new ApiError(400, "invalid course id");
    }

    const course = await Course.findById(courseId).populate("lectures");
    if (!course) {
      return res.status(404).json({
        message: "Course not found"
      })
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { course },
          "get course lecture successfully"
        )
      )

  } catch (error) {
    throw new ApiError(500, error?.message, "error getting course lecture")
  }
})

const editLecture = asyncHandler(async (req, res) => {
  const { lectureTitle, videoInfo, isPreviewFree } = req.body;

  const { courseId, lectureId } = req.params;

  if (!isValidObjectId(courseId) || !isValidObjectId(lectureId))
    throw new ApiError(400, "invalid course id or lecture id");

  try {
    let lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      throw new ApiError(400, "invalid lecture id");
    }

    if (lectureTitle) lecture.lectureTitle = lectureTitle;
    if (videoInfo?.videoUrl) lecture.videoUrl = videoInfo.videoUrl;
    if (videoInfo?.publicId) lecture.publicId = videoInfo.publicId;
    lecture.isPreviewFree = isPreviewFree;

    await lecture.save({ validateBeforeSave: false });

    const course = await Course.findById(courseId)
    if (course && !course.lectures.includes(lecture._id)) {
      course.lectures.push(lecture._id);
      await course.save({ validateBeforeSave: false });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { lecture },
          "lecture created successfully"
        )
      )

  } catch (error) {
    throw new ApiError(400, error?.message, "invalid course id");
  }
})

const removeLecture = asyncHandler(async (req, res) => {
  const { courseId, lectureId } = req.params;

  if (!isValidObjectId(courseId) || !isValidObjectId(lectureId))
    throw new ApiError(400, "invalid course id or lecture id");

  try {
    let course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(400, "invalid course id");
    }

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      throw new ApiError(400, "invalid lecture id");
    }

    await Lecture.findByIdAndDelete(lectureId);

    course.lectures = course.lectures.filter((lec) => lec.toString() !== lectureId.toString());
    await course.save({ validateBeforeSave: false });

    if (lecture.publicId) {
      await deleteVideoFromCloudinary(lecture.publicId);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { message: "lecture deleted successfully" },
          "lecture deleted successfully"
        )
      )

  } catch (error) {
    throw new ApiError(400, error?.message, "invalid course id");
  }
})

export {
  createCourse,
  searchCourse,
  getInstructorCourses,
  getpublishedCourse,
  editCourse,
  getCourseById,
  createLecture,
  getCourseLecture,
  editLecture,
  removeLecture,
}