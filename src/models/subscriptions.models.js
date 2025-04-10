import mongoose, { Schema } from "mongoose";
const subscriptionSchema = new Schema( {
     Subscription: {
        type: Schema.Types.ObjectId,
            ref: "User"
     },
     channel: {
        type: Schema.Types.ObjectId, // one to whom `subscription` IS Subscription 
        ref: "User"
     }
},
{
    timeseries:true
}
);
export const Subscription = mongoose.model("Subscription", subscriptionSchema);