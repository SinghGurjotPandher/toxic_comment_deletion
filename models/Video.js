const mongoose = require('mongoose')

// Video collection stores video's ID, associated user's ID, video title, whether it is currently
// being moderated or not, and publish date.
const videoSchema = new mongoose.Schema({
    id: { // Video Link: https://www.youtube.com/watch?v={id}
        type: String,
        unique: true,
        required: true
    },
    userID: { 
        type: String,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    publishedAt: {
        type: Date,
        required: true
    }
})

videoSchema.virtual('user', {
    ref: 'User',
    localField: 'userID',
    foreignField: 'id',
    justOne: true
})

module.exports = mongoose.model('Video', videoSchema)