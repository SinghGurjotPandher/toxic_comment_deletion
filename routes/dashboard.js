const express = require('express')
const { isLoggedIn } = require('../middleware')
const Video = require('../models/Video')
const router = express.Router()

// Show all videos route
router.get('/', isLoggedIn, async (req, res) => {
    // Queries the videos collection to retrieve all videos of this user sorted in descending order.
    // These videos are passed on the index file for showing to the user.
    let videos = []
    try {
        videos = await Video.find({
            userID: req.user.id
        }).sort({ publishedAt: -1 })
    } catch (error) {
        console.log(error)
        console.log('ERROR: encountered error while search for all videos for display in dashboard.')
    }

    res.render('dashboard/index', {
        displayName: req.user.displayName,
        videos: videos
    })
})

module.exports = router