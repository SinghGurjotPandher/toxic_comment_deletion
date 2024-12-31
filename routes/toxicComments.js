const express = require('express')
const { isLoggedIn } = require('../middleware')
const ToxicComment = require('../models/ToxicComment')

const router = express.Router()
// currently logged in users should see logout button, other users should seen login button

router.get('/', isLoggedIn, async (req, res) => {
    // Fetches toxic comments for the current user and requested videos, which are then given for
    // rendering by the HTML file
    let toxicComments = []
    try {
        toxicComments = await ToxicComment.find({
            userID: req.user.id,
            ...(req.query.videoID && { videoID : req.query.videoID })
        }).sort({ publishedAt: -1 })
    } catch (error) {
        console.log(error)
        console.log('ERROR: error encountered while searching for toxic comments in the database')
    }
    res.render('toxicComments/index', {
        toxicComments: toxicComments
    })
})

module.exports = router