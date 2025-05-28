import ViewContent from '../models/ViewContent.js'
import bizSdk, { Content } from 'facebook-nodejs-business-sdk'
import Integrations from '../models/Integrations.js'

export const createViewContent = async (req, res) => {
    try {
        const {product, fbp, fbc} = req.body
        const integrations = await Integrations.findOne().lean()
        const nuevaVisualizacion = new ViewContent({name: product.name, price: product.price, category: product.category.category})
        const newViewContent = await nuevaVisualizacion.save()
        if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
            const CustomData = bizSdk.CustomData
            const EventRequest = bizSdk.EventRequest
            const UserData = bizSdk.UserData
            const ServerEvent = bizSdk.ServerEvent
            const access_token = integrations.apiToken
            const pixel_id = integrations.apiPixelId
            const api = bizSdk.FacebookAdsApi.init(access_token)
            let current_timestamp = new Date()
            const userData = (new UserData())
                .setClientIpAddress(req.connection.remoteAddress)
                .setClientUserAgent(req.headers['user-agent'])
                .setFbp(fbp)
                .setFbc(fbc)
            const content = (new Content())
                .setId(product._id)
                .setCategory(product.category.category)
                .setItemPrice(product.price)
                .setTitle(product.name)
            const customData = (new CustomData())
                .setContentName(product.name)
                .setContentCategory(product.category.category)
                .setCurrency('clp')
                .setValue(product.price)
                .setContentIds([product._id])
                .setContents([content])
            const serverEvent = (new ServerEvent())
                .setEventId(newViewContent._id.toString())
                .setEventName('ViewContent')
                .setEventTime(current_timestamp)
                .setUserData(userData)
                .setCustomData(customData)
                .setEventSourceUrl(`${process.env.WEB_URL}/tienda/${product.category.slug}/${product.slug}`)
                .setActionSource('website')
            const eventsData = [serverEvent]
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
        return res.json(newViewContent)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getViewContent = async (req, res) => {
    try {
        const visualizaciones = await ViewContent.find()
        res.send(visualizaciones)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}