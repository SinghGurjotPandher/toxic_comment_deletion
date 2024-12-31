const mongoose = require('mongoose')

// User collection stores user's ID, name, and access token which are accessed from YouTube Data API
const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true,
        unique: true
    }
})

module.exports = mongoose.model('User', userSchema)