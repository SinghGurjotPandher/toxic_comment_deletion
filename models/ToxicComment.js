const mongoose = require('mongoose')

// Toxic comment collection stores id of the comment, associated video id, associated user id,
// time of publishing, the actual text, and toxicity score of the text
const toxicCommentSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    videoID: {
        type: String,
        required: true,
        ref: 'Video'
    },
    userID: {
        type: String,
        required: true,
    },
    publishedAt: {
        type: Date,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    toxicityScore: {
        type: Number,
        required: true
    }
})

toxicCommentSchema.virtual('video', {
    ref: 'Video',
    localField: 'videoID',
    foreignField: 'id',
    justOne: true
})

module.exports = mongoose.model('ToxicComment', toxicCommentSchema)