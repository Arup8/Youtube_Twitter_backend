import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = Schema({
    videoFile: {
        // type: String, // cloudinary url
        type: {
            url: String,
            public_id: String,
        },
        required: true
    },
    thumbnail: {
        // type: String, // cloudinary url
        type: {
            url: String,
            public_id: String,
        },
        required: true
    },
    title: {
        type: String, 
        required: true
    },
    description: {
        type: String, 
        required: true
    },
    duration: {
        type: Number, 
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate) // paginate is used for that from where to where I should give the video thats like 

export const Video = mongoose.model('Video', videoSchema)