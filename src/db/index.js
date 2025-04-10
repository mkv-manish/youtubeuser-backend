import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${"mongodb+srv://youtubeuser:youtube123@cluster0.lm9ub.mongodb.net"}/${DB_NAME}`)

        console.log(` \n MongoDB connected ! DB host ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB Connection errpr ", error);
        process.exit(1)
                
    }
}

export default connectDB;