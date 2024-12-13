class ApiError extends Error {
  constructor(
    statusCode,
    messge="something went wrong",
    errors=[],
    stack=""
  ) {
    super(messge)
    this.statusCode = statusCode;
    this.messge = messge;
    this.data = null;
    this.errors = errors;
    this.success = false;

    if(stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this,this.constructor)
    }
  }
}

export {
  ApiError
}