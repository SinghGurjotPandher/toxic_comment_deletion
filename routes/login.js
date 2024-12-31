const express = require('express')
const router = express.Router()

// Login page for this application
router.get('/', (req, res) => {
    res.render('login/index')
})

module.exports = router