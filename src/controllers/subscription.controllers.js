import bizSdk from 'facebook-nodejs-business-sdk'
import Integrations from '../models/Integrations.js'

export const createSubscription = async (req, res) => {
    try {
        const integrations = await Integrations.findOne().lean()
        if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
            const EventRequest = bizSdk.EventRequest
            const UserData = bizSdk.UserData
            const ServerEvent = bizSdk.ServerEvent
            const access_token = integrations.apiToken
            const pixel_id = integrations.apiPixelId
            const api = bizSdk.FacebookAdsApi.init(access_token)
            let current_timestamp = Math.floor(new Date() / 1000)
            const userData = (new UserData())
                .setEmail(req.body.email)
                .setClientIpAddress(req.connection.remoteAddress)
                .setClientUserAgent(req.headers['user-agent'])
                .setFbp(req.body.fbp)
                .setFbc(req.body.fbc)
            const serverEvent = (new ServerEvent())
                .setEventId(req.body.eventId)
                .setEventName('Lead')
                .setEventTime(current_timestamp)
                .setUserData(userData)
                .setEventSourceUrl(`${process.env.WEB_URL}${req.body.page}`)
                .setActionSource('website')
            const eventsData = [serverEvent];
            const eventRequest = (new EventRequest(access_token, pixel_id))
                .setEvents(eventsData)
            eventRequest.execute().then(
                response => {
                    console.log('Response: ', response)
                },
                err => {
                    console.error('Error: ', err)
                }
            )
        }
        return res.sendStatus(200)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}