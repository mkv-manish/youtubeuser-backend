import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import dotenv from "dotenv";

dotenv.config()


//  Configuration cloudinary

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

    const uplodOnCloudinary = async(localFilePath) => {
        try {

            
            if(!localFilePath) return null
            const response = await cloudinary.uploader.upload(
                localFilePath, {
                    resource_type: "auto"

                }
            )
            console.log("FIle uploded on cloudinary. FIle src: " + response.url);
            // once the file uploded, we would like to deleted it from our server
            fs.unlinkSync(localFilePath)
            return response
            
        } catch (error) {
            fs.unlinkSync(localFilePath)
            return null
            
        }
    }

    const deleteFromCloudinary = async (publicId) => {
        try {
            const result = await cloudinary.uploader.destroy(publicId)
            console.log("Deleting from cloudinary. Public id")
        } catch (error) {
            console.log("Error deleting from cloudinary", error)
            return null
        }
    }

    export { uplodOnCloudinary, deleteFromCloudinary }