function isLoggedIn(req, res, next) {
    // Determines if a user is logged in
    req.user ? next() : res.redirect('/login')
}

function isNotLoggedIn(req, res) {
    // Determines if a user is not logged in
    return req.user == undefined
}

module.exports = { isLoggedIn, isNotLoggedIn }