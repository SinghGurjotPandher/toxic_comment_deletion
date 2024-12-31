const express = require('express')
const passport = require('passport')
const router = express.Router()
const User = require('../models/User')

const TOKEN_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'

async function findUser(userId, accessToken) {
    // Returns null when user wasn't found, otherwise returns the saved user while updating its access
    // token if available
    try {
        const user = await User.findOne({
            id: userId
        })
        if (!user) return null
        if (accessToken) {
            user.accessToken = accessToken
            await user.save()
        }
        return user
    } catch (error) {
        console.log(error)
        console.log('ERROR: encountered error while finding the user.')
    }
}

async function createUser(profile, accessToken) {
    // Inserts a new user (id, name, token) into the User collection
    const newUser = new User({
        id: profile.id,
        displayName: profile.displayName,
        accessToken: accessToken
    })
    try {
        await newUser.save()
    } catch (error) {
        console.log(error)
        console.log('ERROR: encountered error while creating the user.')
    }
}

const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/authGoogle/callback",
    passReqToCallback : true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    // If user exists, then sign in, otherwise register by creating the user, and then sign in
    // currently, refreshToken is undefined because application is in testing mode. However for
    // production mode, ensure that you are making use of refreshToken to extend user access.
    const user = await findUser(profile.id, accessToken)
    if (!user) await createUser(profile, accessToken)
    return done(null, profile.id)
  }
))

passport.serializeUser(function(userId, done) {
    // Saves only user id to minimize storage usage in the browser
    done(null, userId)
})

passport.deserializeUser(async function(userId, done) {
    // Finds user based on the user id whenever information is needed
    done(null, await findUser(userId))
})

router.get('/', 
    passport.authenticate('google', {
        // profile provides access to user's basic information while the link authorizes access token
        // to access, edit, delete user's YouTube channel content
        scope: ['profile', TOKEN_SCOPE]
    })
)

router.get('/callback', 
    passport.authenticate('google', {
        // success redirects to dashboard and failure redirects to login page
        successRedirect: '/dashboard',
        failureRedirect: '/login'
    })
)

router.get('/logout', (req, res, next) => {
    // Logout the currently logged in user
    req.logout((error) => {
        if (error) return next(error)
        res.redirect('/')
    })
})

module.exports = router