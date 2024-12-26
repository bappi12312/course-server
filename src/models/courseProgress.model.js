import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    lectureProgress: [
        {
            lectureId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lecture",
                required: true
            },
            isCompleted: {
                type: Boolean,
                default: false
            }
        }
    ],
    isCompleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);