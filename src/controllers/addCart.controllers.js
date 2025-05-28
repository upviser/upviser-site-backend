import AddCart from '../models/AddCart.js'
import bizSdk from 'facebook-nodejs-business-sdk'
import Integrations from '../models/Integrations.js'

export const createAddCart = async (req, res) => {
    try {
        const {product, fbp, fbc} = req.body
        const integrations = await Integrations.findOne().lean()
        const nuevoAñadir = new AddCart({quantity: product.quantity, name: product.name, price: product.price, category: product.category.category})
        const newAddToCart = await nuevoAñadir.save()
        if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
            const Content = bizSdk.Content
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
                .setQuantity(Number(product.quantity))
                .setItemPrice(product.price)
                .setTitle(product.name)
            const customData = (new CustomData())
                .setContentName(product.name)
                .setContentType(product.category.category)
                .setCurrency('clp')
                .setValue(product.price * Number(product.quantity))
                .setContentIds([product._id])
                .setContents([content])
            const serverEvent = (new ServerEvent())
                .setEventId(newAddToCart._id.toString())
                .setEventName('AddToCart')
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
        return res.json(newAddToCart)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getAddCart = async (req, res) => {
    try {
        const data = await AddCart.find()
        return res.send(data)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}