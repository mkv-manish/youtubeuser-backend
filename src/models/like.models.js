import mongoose, { Schema, Types } from "mongoose";

const likeSchema = new Schema(
    {
        // either of `video`, `comment` or `tweet` will be assigened others are null

        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "comment"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    }, {timeseries: true}
);

export const Like = mongoose.model("Like", likeSchema);