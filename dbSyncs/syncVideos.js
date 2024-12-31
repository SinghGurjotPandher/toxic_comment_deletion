const User = require('../models/User')
const Video = require('../models/Video')

async function getChannelID(accessToken) {
    // Gets the channel ID of the user with this access token. Fetches the playlists for this user,
    // then, gets the channel ID from this list.
    let channelID = null // set to null if no channel exists
    try {
        const params = new URLSearchParams({
            part: 'id',
            mine: 'true'
        })
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`, {
            headers: {
                Authorization : `Bearer ${accessToken}`
            }
        })
        if (!response.ok) {
            console.log(response)
            throw new Error('ERROR: error encountered in response of channel playlist items.')
        }
        const data = await response.json()
        if (data.items && data.items.length >= 1) channelID = data.items[0].id    
    } catch (error) {
        console.log(error)
        console.log('ERROR: error encountered while fetching playlist items.')
    }
    return channelID
}

async function fetchVideos(channelID, token, userID, nextPageToken) {
    // Using channel ID and the given token, all videos for a user are fetched until we stop getting
    // nextPageToken at which point there are no more videos available.
    let videos = []
    if (channelID) {
        try {
            const params = new URLSearchParams({
                part: 'snippet',
                maxResults: '50',
                playlistId: `UU${channelID.slice(2)}`,
                ...(nextPageToken && { pageToken: nextPageToken })
            })
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (!response.ok) {
                console.log(response)
                throw new Error('ERROR: response is not with status code 200 when fetching videos.')
            }
            const data = await response.json()
            const videosData = data.items

            for (const video of videosData) {
                videos.push(new Video({
                    id: video.snippet.resourceId.videoId,
                    userID: userID,
                    title: video.snippet.title,
                    publishedAt: video.snippet.publishedAt
                }))
            }   
            if (data.nextPageToken) {
                const result = await fetchVideos(channelID, token, userID, data.nextPageToken)
                videos.push(...result)
            }
        } catch (error) {
            console.log(error)
            console.log('ERROR: error encountered while fetching videos.')
        }
    }
    return videos
}

async function updateVideosDB(fetchedVideos, userID) {    
    // Updates the database for this application to ensure it is same as videos on user's channel.
    const storedVideosIDs = new Set((await Video.find({ userID: userID}, 'id')).map(video => video.id))
    const fetchedVideosIDs = new Set()

    for (const fetchedVideo of fetchedVideos) { // if any video was added to YouTube channel 
        if (!storedVideosIDs.has(fetchedVideo.id)) {
            try {
                await fetchedVideo.save()
            } catch (error) {
                console.log(error)
                console.log('ERROR: encountered error while saving the new fetched video.')
            }
        }
        fetchedVideosIDs.add(fetchedVideo.id)
    }

    for (const storedVideoID of storedVideosIDs) { // if any video was deleted from YouTube channel
        if (!fetchedVideosIDs.has(storedVideoID)) {
            await Video.deleteOne({
                id: storedVideoID
            })
        }
    }
}

async function syncVideosDB() {
    // Updates the database by adding new videos and deleting old videos since the last time we
    // fetched data from YouTube Data API
    let users = []
    try {
        users = await User.find()
    } catch (error) {
        console.log(error)
        console.log('ERROR: encountered error while retrieving the list of users from the database.')
    }
    for (const user of users) {
        const channelID = await getChannelID(user.accessToken)
        if (channelID) {
            const fetchedVideos = await fetchVideos(channelID, user.accessToken, user.id)
            await updateVideosDB(fetchedVideos, user.id)
        }
    }
}

module.exports = { syncVideosDB }