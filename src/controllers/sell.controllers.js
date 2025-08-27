import Sell from '../models/Sell.js'
import Product from '../models/Product.js'
import bizSdk from 'facebook-nodejs-business-sdk'
import Integrations from '../models/Integrations.js'
import { sendEmailBuyBrevo } from '../utils/sendEmailBuyBrevo.js'
import { sendEmailBrevo } from '../utils/sendEmailBrevo.js'
import StoreData from '../models/StoreData.js'
import Style from '../models/Style.js'

export const createSell = async (req, res) => {
    try {
        const {email, region, city, firstName, lastName, address, details, phone, coupon, cart, shipping, state, pay, total, fbp, fbc, shippingMethod, shippingState, subscription} = req.body
        const integrations = await Integrations.findOne().lean()
        if (state === 'Pago realizado') {
            if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
                const phoneFormat = `56${phone}`
                const CustomData = bizSdk.CustomData
                const EventRequest = bizSdk.EventRequest
                const UserData = bizSdk.UserData
                const ServerEvent = bizSdk.ServerEvent
                const access_token = integrations.apiToken
                const pixel_id = integrations.apiPixelId
                const api = bizSdk.FacebookAdsApi.init(access_token)
                let current_timestamp = new Date()
                const url = `${process.env.WEB_URL}/finalizar-compra/`
                const userData = (new UserData())
                    .setFirstName(firstName.toLowerCase())
                    .setLastName(lastName.toLowerCase())
                    .setEmail(email.toLowerCase())
                    .setPhone(phoneFormat)
                    .setCity(city.toLowerCase())
                    .setCountry('cl')
                    .setClientIpAddress(req.connection.remoteAddress)
                    .setClientUserAgent(req.headers['user-agent'])
                    .setFbp(fbp)
                    .setFbc(fbc)
                const customData = (new CustomData())
                    .setCurrency('clp')
                    .setValue(total)
                const serverEvent = (new ServerEvent())
                    .setEventName('Purchase')
                    .setEventTime(current_timestamp)
                    .setUserData(userData)
                    .setCustomData(customData)
                    .setEventSourceUrl(url)
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
            const storeData = await StoreData.findOne().lean()
            const style = await Style.findOne().lean()
            sendEmailBuyBrevo({ sell: req.body, storeData: storeData, style: style })
        } else if (state === 'Pedido realizado') {
            if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
                const phoneFormat = `56${phone}`
                const CustomData = bizSdk.CustomData
                const EventRequest = bizSdk.EventRequest
                const UserData = bizSdk.UserData
                const ServerEvent = bizSdk.ServerEvent
                const access_token = integrations.apiToken
                const pixel_id = integrations.apiPixelId
                const api = bizSdk.FacebookAdsApi.init(access_token)
                let current_timestamp = new Date()
                const url = `${process.env.WEB_URL}/finalizar-compra/`
                const userData = (new UserData())
                    .setFirstName(firstName.toLowerCase())
                    .setLastName(lastName.toLowerCase())
                    .setEmail(email.toLowerCase())
                    .setPhone(phoneFormat)
                    .setCity(city.toLowerCase())
                    .setCountry('cl')
                    .setClientIpAddress(req.connection.remoteAddress)
                    .setClientUserAgent(req.headers['user-agent'])
                    .setFbp(fbp)
                    .setFbc(fbc)
                const customData = (new CustomData())
                    .setCurrency('clp')
                    .setValue(total)
                const serverEvent = (new ServerEvent())
                    .setEventName('AddPaymentInfo')
                    .setEventTime(current_timestamp)
                    .setUserData(userData)
                    .setCustomData(customData)
                    .setEventSourceUrl(url)
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
        }
        const cuponUpper = coupon?.toUpperCase()
        const sells = await Sell.countDocuments()
        const storeData = await StoreData.findOne().lean()
        const buyOrder = `${storeData.name.toUpperCase()}-${1001 + Number(sells)}`
        const newSell = new Sell({email, region, city, firstName: firstName[0].toUpperCase() + firstName.substring(1), lastName: lastName[0].toUpperCase() + lastName.substring(1), address, details, phone: phone, coupon: cuponUpper, cart, shipping, state, pay, total, shippingMethod, shippingState, buyOrder, subscription, shippingLabel: req.body.shippingLabel, number: req.body.number})
        const sellSave = await newSell.save()
        res.json(sellSave)
        setTimeout(async () => {
            const sell = await Sell.findById(sellSave._id)
            if (sell.state === 'Pedido realizado') {
                sell.cart.map(async product => {
                    const prod = await Product.findById(product._id)
                    if (product.variation?.variation) {
                        if (product.variation.subVariation) {
                            if (product.variation.subVariation2) {
                                const variationIndex = prod.variations.variations.findIndex((variation) => variation.variation === product.variation.variation && variation.subVariation === product.variation.subVariation && variation.subVariation2 === product.variation.subVariation2)
                                prod.variations.variations[variationIndex].stock = prod.variations.variations[variationIndex].stock + product.quantity
                                await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                            } else {
                                const variationIndex = prod.variations.variations.findIndex((variation) => variation.variation === product.variation?.variation && variation.subVariation === product.variation.subVariation)
                                prod.variations.variations[variationIndex].stock = prod.variations.variations[variationIndex].stock + product.quantity
                                await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                            }
                        } else {
                            const variationIndex = prod.variations.variations.findIndex((variation) => variation.variation === product.variation.variation)
                            prod.variations.variations[variationIndex].stock = prod.variations.variations[variationIndex].stock + product.quantity
                            await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                        }
                    } else {
                        await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                    }
                })
            }
        }, 10 * 60 * 1000)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getSells = async (req, res) => {
    try {
        const sells = await Sell.find().sort({ createdAt: -1 })
        return res.send(sells)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getSell = async (req, res) => {
    try {
        const sell = await Sell.findById(req.params.id)
        if (!sell) return res.sendStatus(404)
        return res.json(sell)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getSellEmail = async (req, res) => {
    try {
        const sell = await Sell.findOne({ email: req.params.email }).sort({ createdAt: -1 }).limit(1)
        return res.json(sell)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const updateSell = async (req, res) => {
    try {
        const { sell, fbp, fbc } = req.body
        const updateSell = await Sell.findByIdAndUpdate(req.params.id, {...sell, shippingCode: shippingCode}, {new: true})
        if (sell.shippingState === 'Productos empaquetados') {
            await sendEmailBrevo({ subscribers: [{ firstName: sell.firstName, email: sell.email }], emailData: { affair: 'Los productos de tu compra ya han sido empaquetados', title: 'Te avisaremos cuando ya esten tus productos en camino', paragraph: 'Hola, te queriamos comentar que ya hemos empaquetado los productos de tu compra, en cuanto realicemos el envio te avisaremos por este medio.' } })
        }
        if (sell.shippingState === 'Envío realizado') {
            await sendEmailBrevo({ subscribers: [{ firstName: sell.firstName, email: sell.email }], emailData: { affair: 'Tus productos ya se encuentran en camino', title: 'Tu compra ya esta en camino a tu hogar', paragraph: 'Hola, queriamos comentarte que ya hemos realizado el envio de los productos de tu compra.' } })
        }
        if (sell.state === 'Pago realizado') {
            const integrations = await Integrations.findOne().lean()
            if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
                const CustomData = bizSdk.CustomData
                const EventRequest = bizSdk.EventRequest
                const UserData = bizSdk.UserData
                const ServerEvent = bizSdk.ServerEvent
                const access_token = integrations.apiToken
                const pixel_id = integrations.apiPixelId
                const api = bizSdk.FacebookAdsApi.init(access_token)
                let current_timestamp = new Date()
                const url = `${process.env.WEB_URL}/gracias-por-comprar/`
                const userData = (new UserData())
                    .setFirstName(sell.firstName.toLowerCase())
                    .setLastName(sell.lastName.toLowerCase())
                    .setEmail(sell.email.toLowerCase())
                    .setPhone(sell.phone)
                    .setCity(sell.city.toLowerCase())
                    .setClientIpAddress(req.connection.remoteAddress)
                    .setClientUserAgent(req.headers['user-agent'])
                    .setFbp(fbp)
                    .setFbc(fbc)
                const customData = (new CustomData())
                    .setCurrency('clp')
                    .setValue(sell.total)
                const serverEvent = (new ServerEvent())
                    .setEventName('Pucharse')
                    .setEventTime(current_timestamp)
                    .setUserData(userData)
                    .setCustomData(customData)
                    .setEventSourceUrl(url)
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
            const storeData = await StoreData.findOne().lean()
            const style = await Style.findOne().lean()
            sendEmailBuyBrevo({ sell: sell, storeData: storeData, style: style })
        }
        return res.send(updateSell)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const updatedSell = async (req, res) => {
    try {
        const updatedSell = await Sell.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (req.body.state === 'Pago no realizado') {
            updatedSell.cart.map(async product => {
                const prod = await Product.findById(product._id)
                if (product.variation?.variation) {
                    if (product.variation.subVariation) {
                        if (product.variation.subVariation2) {
                            const variationIndex = prod.variations.variations.findIndex((variation) => variation.variation === product.variation.variation && variation.subVariation === product.variation.subVariation && variation.subVariation2 === product.variation.subVariation2)
                            prod.variations.variations[variationIndex].stock = prod.variations.variations[variationIndex].stock + product.quantity
                            await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                        } else {
                            const variationIndex = prod.variations.variations.findIndex((variation) => variation.variation === product.variation?.variation && variation.subVariation === product.variation.subVariation)
                            prod.variations.variations[variationIndex].stock = prod.variations.variations[variationIndex].stock + product.quantity
                            await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                        }
                    } else {
                        const variationIndex = prod.variations.variations.findIndex((variation) => variation.variation === product.variation.variation)
                        prod.variations.variations[variationIndex].stock = prod.variations.variations[variationIndex].stock + product.quantity
                        await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                    }
                } else {
                    await Product.findByIdAndUpdate(product._id, { stock: prod.stock + product.quantity, variations: prod.variations })
                }
            })
        } else if (req.body.state === 'Pago realizado') {
            const integrations = await Integrations.findOne().lean()
            if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
                const CustomData = bizSdk.CustomData
                const EventRequest = bizSdk.EventRequest
                const UserData = bizSdk.UserData
                const ServerEvent = bizSdk.ServerEvent
                const access_token = integrations.apiToken
                const pixel_id = integrations.apiPixelId
                const api = bizSdk.FacebookAdsApi.init(access_token)
                let current_timestamp = new Date()
                const url = `${process.env.WEB_URL}/gracias-por-comprar/`
                const userData = (new UserData())
                    .setFirstName(updatedSell.firstName.toLowerCase())
                    .setLastName(updatedSell.lastName.toLowerCase())
                    .setEmail(updatedSell.email.toLowerCase())
                    .setPhone(updatedSell.phone)
                    .setCity(updatedSell.city.toLowerCase())
                    .setClientIpAddress(req.connection.remoteAddress)
                    .setClientUserAgent(req.headers['user-agent'])
                    .setFbp(fbp)
                    .setFbc(fbc)
                const customData = (new CustomData())
                    .setCurrency('clp')
                    .setValue(updatedSell.total)
                const serverEvent = (new ServerEvent())
                    .setEventName('Pucharse')
                    .setEventTime(current_timestamp)
                    .setUserData(userData)
                    .setCustomData(customData)
                    .setEventSourceUrl(url)
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
            const storeData = await StoreData.findOne().lean()
            const style = await Style.findOne().lean()
            sendEmailBuyBrevo({ sell: updatedSell, storeData: storeData, style: style })
        }
        return res.send(updatedSell)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getSellByEmail = async (req, res) => {
    try {
        const sells = await Sell.find({email: req.params.id}).sort({ createdAt: -1 })

        if (!sells) {
            return undefined
        }

        return res.send(sells)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}