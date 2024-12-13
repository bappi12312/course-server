import { v2 as cloudinary } from "cloudinary";
import fs from "fs"


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if(!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath,{
      resource_type: "auto"
    })

    fs.unlinkSync(localFilePath)
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath)
  }
}

const deleteMediaFromCloudinary = async(publicId) => {
 try {
  await cloudinary.uploader.destroy(publicId)
 } catch (error) {
  console.log(error);
 }
}
 const deleteVideoFromCloudinary = async (publicId) => {
  try {
      await cloudinary.uploader.destroy(publicId,{resource_type:"video"});
  } catch (error) {
      console.log(error);
      
  }
}

export {uploadOnCloudinary,deleteMediaFromCloudinary,deleteVideoFromCloudinary}