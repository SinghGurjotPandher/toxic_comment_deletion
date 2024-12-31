const ToxicComment = require("../models/ToxicComment")
const Video = require("../models/Video")
const { google } = require("googleapis")

const REJECTION_THRESHOLD = 0.4

async function fetchVideos() {
    // Fetches all the videos from the database
    let videos = []
    try {
        videos = await Video.find().populate('user')
    } catch (error) {
        console.log(error)
        console.log('ERROR: error encounted while retrieving videos from the database.')
    }
    return videos
}

async function fetchComments(videoID, accessToken, nextPageToken) {
    // Fetches all the comments of the given video ID
    let comments = []
    try {
        const params = new URLSearchParams({
            part: 'snippet',
            videoId: videoID,
            maxResults: '100',
            ...(nextPageToken && { pageToken: nextPageToken })
        })
        const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        const data = await response.json()
        if (data.error && data.error.errors[0].reason == "commentsDisabled") {
            return comments
        }
        else if (!response.ok) {
            console.log(response)
            throw new Error('ERROR: error encountered in response of fetching comments.')
        }
        else {
            comments = data.items
            if (data.nextPageToken) {
                const result = await fetchComments(videoID, accessToken, data.nextPageToken)
                comments.push(...result)
            }
        }
    } catch (error) {
        console.log(error)
        console.log('ERROR: encountered error while fetching comments for a video.')
    }
    return comments
}

async function getToxicityScore(text) {
    // Returns the toxicity score of the given text using Perspective API 
    let score = 0
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // as per API's requirements
        const DISCOVERY_URL = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1'
        const client = await google.discoverAPI(DISCOVERY_URL)
        const response = await client.comments.analyze({
            key: process.env.PERSPECTIVE_API_KEY,
            resource: {
                comment: {
                    text: text
                },
                requestedAttributes: {
                    TOXICITY: {}
                },
                languages: ['en']
            }
        })
        score = response.data.attributeScores.TOXICITY.summaryScore.value
    } catch (error) {
        console.log(error)
        console.log('ERROR: error encountered while determining toxicity score of a comment.')
    }
    return score
}

async function setModerationStatus(commentIDs, accessToken, moderationStatus) {
    // Sets the moderation status of the comments to the given moderation status
    try {
        const params = new URLSearchParams({
            id: commentIDs,
            moderationStatus: moderationStatus
        })
        const response = await fetch(`https://www.googleapis.com/youtube/v3/comments/setModerationStatus?${params.toString()}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        if (!response.ok) {
            console.log(response)
            throw new Error('ERROR: error encountered while updating the moderation status of the comments')
        }
    } catch (error) {
        console.log(error)
        console.log('ERROR: error encountered while changing the moderation status of comments')
    }
}

async function updateToxicComments(videoID, userID, comments, accessToken) {
    // Updates moderation status of toxic comments to rejected and adds them to the collection of
    // toxic comments in the database
    let rejectedIDs = []
    try {
        for (const comment of comments) {
            const topLevelComment = comment.snippet.topLevelComment
            const toxicityScore = await getToxicityScore(topLevelComment.snippet.textDisplay)
            if (toxicityScore >= REJECTION_THRESHOLD) {
                const newToxicComment = new ToxicComment({
                    id: topLevelComment.id,
                    videoID: videoID,
                    userID: userID,
                    publishedAt: topLevelComment.snippet.updatedAt,
                    text: topLevelComment.snippet.textDisplay,
                    toxicityScore: toxicityScore
                })    
                await newToxicComment.save()
                rejectedIDs.push(topLevelComment.id)
            }
        }   
    } catch (error) {
        console.log(error)
        console.log('ERROR: encountered error while updating toxic comments database.')
    }
    if (rejectedIDs.length != 0) await setModerationStatus(rejectedIDs.join(','), accessToken, 'rejected')
}

async function syncToxicCommentsDB() {
    // For each of the videos, the moderation status of toxic comments is updated to rejected and are 
    // added to the database
    const videos = await fetchVideos()
    for (const video of videos) {
        const comments = await fetchComments(video.id, video.user.accessToken)
        await updateToxicComments(video.id, video.user.id, comments, video.user.accessToken)
    }
}

module.exports = { syncToxicCommentsDB }