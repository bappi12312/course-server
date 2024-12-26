import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    courseTitle:{
        type:String,
        required:true
    },
    subtitle:{
        type:String,
    },
    courseDescription:{
        type:String,
    },
    coursePrice:{
        type:Number,
    },
    courseImage:{
        type:String,
        default:""
    },
    instructorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    isPublished:{
        type:Boolean,
        default:false
    },
    // isApproved:{
    //     type:Boolean,
    //     default:false
    // },
    lectures:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Lecture"
        }
    ],
    enrolledStudents:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ]
},{timestamps:true})

export const Course = mongoose.model("Course",courseSchema)