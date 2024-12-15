if(!isValidObjectId(courseId))
  throw new ApiError(400,"invalid course id");

return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {lecture},
        "lecture created successfully"
      )
    )
 