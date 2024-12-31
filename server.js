if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// Requiring libraries 
const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const bodyParser = require('body-parser')
const passport = require('passport')
const session = require('express-session')
// Creating a mini-app
const app = express()

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layouts/layout')

app.use(bodyParser.urlencoded({ limit: '10mb', extended: false })) // handles url-encoded data
app.use(expressLayouts)
// stores session information for retrieval
app.use(session({secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false}))
app.use(passport.initialize())
app.use(passport.session())

// database setup (MongoDB)
const mongoose = require('mongoose')
mongoose.connect(process.env.DATABASE_URL, { })
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose'))

// Supported routes
const indexRouter = require('./routes/index')
const loginRouter = require('./routes/login')
const authGoogleRouter = require('./routes/auth')
const dashboardRouter = require('./routes/dashboard')
const toxicCommentsRouter = require('./routes/toxicComments')
// associated URL paths
app.use('/', indexRouter)
app.use('/login', loginRouter)
app.use('/authGoogle', authGoogleRouter)
app.use('/dashboard', dashboardRouter)
app.use('/toxicComments', toxicCommentsRouter)

// for interval-based tasks: updating videos database
const cron = require('node-cron')
const { syncVideosDB } = require('./dbSyncs/syncVideos')
const { syncToxicCommentsDB } = require('./dbSyncs/syncToxicComments')

// use 0 1 * * 1 // runs once at 1:00 AM every Monday
let isRunning = false
cron.schedule('0 1 * * 1', async () => {
    if (isRunning) return
    isRunning = true
    await syncVideosDB()
    await syncToxicCommentsDB()
    isRunning = false
})

app.listen(process.env.PORT)