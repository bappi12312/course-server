import mongoose from "mongoose";

const coursePurchaseSchema = new mongoose.Schema({
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
    purchasePrice: {
        type: Number,
        required: true
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    paymentId: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enumn: ["pending", "completed", "failed"],
        default: "pending"
    }
}, { timestamps: true });

export const CoursePurchase = mongoose.model("CoursePurchase", coursePurchaseSchema);