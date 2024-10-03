import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localfilePath) => {
    try {
        if(!localfilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localfilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfully
        // console.log("File is uploaded on Cloudinary ", response.url);
        // now unlink the file means delete those from public
        fs.unlinkSync(localfilePath)
        return response;
    } catch (error) {
        fs.unlink(localfilePath) // remove the locally saved temporary file as the upload operationn got failed  
        return null;
    }
}

const deleteOnCloudinary = async (public_id, resource_type="image") => {
    try {
        if (!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
    } catch (error) {
        return error;
        // console.log("delete on cloudinary failed", error);
    }
};

export {uploadOnCloudinary, deleteOnCloudinary}