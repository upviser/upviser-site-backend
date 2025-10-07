import Calendar from '../models/Calendar.js'
import Meeting from '../models/Meeting.js'
import { sendEmailBrevo } from '../utils/sendEmailBrevo.js'
import Client from '../models/Client.js'
import axios from 'axios'
import ClientData from '../models/ClientData.js'
import moment from 'moment-timezone'
import StoreData from '../models/StoreData.js'
import bizSdk from 'facebook-nodejs-business-sdk'
import Zoom from '../models/Zoom.js'
import { isTokenExpired } from '../utils/zoom.js'
import Integrations from '../models/Integrations.js'
import Style from '../models/Style.js'
import qs from 'qs'

export const editCalendar = async (req, res) => {
    try {
        const calendar = await Calendar.findOne({ name: req.body.name }).lean()
        if (calendar === null) {
            const newCalendar = new Calendar(req.body)
            const newCalendarSave = await newCalendar.save()
            return res.json(newCalendarSave)
        } else {
            const calendarEdit = await Calendar.findByIdAndUpdate(req.body._id, req.body, { new: true })
            return res.json(calendarEdit)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getCalendar = async (req, res) => {
    try {
        const calendar = await Calendar.find()
        if (!calendar) {
            return res.status(404).json({ message: "No tiene calendarios creados" });
        }
        return res.json(calendar)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getOneCalendar = async (req, res) => {
    try {
        const calendar = await Calendar.findById(req.params.id)
        return res.json(calendar)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const deleteCalendar = async (req, res) => {
    try {
        const deleteCalendar = await Calendar.findByIdAndDelete(req.params.id)
        return res.json(deleteCalendar)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const CreateMeeting = async (req, res) => {
    try {
        if (req.body.type === 'Llamada por Zoom') {
            const integrations = await Integrations.findOne();
            let token
            if (isTokenExpired(integrations.zoomCreateToken, integrations.zoomExpiresIn)) {
                const response = await axios.post('https://zoom.us/oauth/token', qs.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: integrations.zoomRefreshToken
                }), {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                token = response.data.access_token
                await Integrations.findByIdAndUpdate(integrations._id, { zoomToken: token, zoomRefreshToken: response.data.refresh_token, zoomExpiresIn: response.data.expires_in, zoomCreateToken: new Date() }, { new: true })
            } else {
                token = integrations.zoomToken
            }
            const meetingData = {
                topic: req.body.call,
                type: 2,
                start_time: moment.tz(req.body.date, 'America/Santiago').format(),
                duration: req.body.duration
            }
            const meetingResponse = await axios.post(`https://api.zoom.us/v2/users/me/meetings`, meetingData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }).catch(error => console.log(error))
            if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
                const Content = bizSdk.Content
                const CustomData = bizSdk.CustomData
                const EventRequest = bizSdk.EventRequest
                const UserData = bizSdk.UserData
                const ServerEvent = bizSdk.ServerEvent
                const access_token = integrations.apiToken
                const pixel_id = integrations.apiPixelId
                const api = bizSdk.FacebookAdsApi.init(access_token)
                let current_timestamp = Math.floor(new Date() / 1000)
                const userData = (new UserData())
                    .setFirstName(req.body.firstName)
                    .setLastName(req.body.lastName)
                    .setEmail(req.body.email)
                    .setPhone(req.body.phone && req.body.phone !== '' ? `56${req.body.phone}` : undefined)
                    .setClientIpAddress(req.connection.remoteAddress)
                    .setClientUserAgent(req.headers['user-agent'])
                    .setFbp(req.body.fbp)
                    .setFbc(req.body.fbc)
                const content = (new Content())
                    .setId(req.body.service)
                    .setQuantity(1)
                    .setItemPrice(req.body.price && req.body.price !== '' ? Number(req.body.price) : undefined)
                const customData = (new CustomData())
                    .setContentName(req.body.meeting)
                    .setContents([content])
                    .setCurrency('clp')
                    .setValue(req.body.price && req.body.price !== '' ? Number(req.body.price) : undefined)
                const serverEvent = (new ServerEvent())
                    .setEventId(req.body.eventId)
                    .setEventName('Schedule')
                    .setEventTime(current_timestamp)
                    .setUserData(userData)
                    .setCustomData(customData)
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
            const newMeeting = new Meeting({ ...req.body, url: meetingResponse.data.start_url})
            const newMeetingSave = await newMeeting.save()
            const client = await Client.findOne({ email: req.body.email })
            if (client) {
                await axios.post(`${process.env.API_URL}/clients`, req.body)
            } else {
                const newClient = new Client(req.body)
                await newClient.save()
            }
            res.json(newMeetingSave)
            const clientData = await ClientData.find()
            const storeData = await StoreData.find()
            const style = await Style.find()
            const date = moment.tz(req.body.date, 'America/Santiago').format()
            await sendEmailBrevo({ subscribers: [{ name: req.body.firstName, email: req.body.email }], emailData: { affair: `¡Hola ${req.body.firstName}! Tu llamada ha sido agendada con exito`, title: 'Hemos agendado tu llamada exitosamente', paragraph: `¡Hola ${req.body.firstName}! Te queriamos informar que tu llamada con fecha ${new Date(req.body.date).getDate()}/${date.getMonth() + 1}/${date.getFullYear()} a las ${date.getHours()}:${date.getMinutes() >= 9 ? date.getMinutes() : `0${date.getMinutes()}`} ha sido agendada con exito, aqui te dejamos el acceso a la llamada en el siguiente boton, para cualquier consulta comunicate con nostros a traves de nuestro Whatsapp +56${storeData[0].phone}.`, buttonText: 'Ingresar a la llamada', url: meetingResponse.data.start_url }, clientData: clientData, storeData: storeData[0], style: style[0] })
        } else {
            const integrations = await Integrations.findOne().lean()
            if (integrations && integrations.apiToken && integrations.apiToken !== '' && integrations.apiPixelId && integrations.apiPixelId !== '') {
                const Content = bizSdk.Content
                const CustomData = bizSdk.CustomData
                const EventRequest = bizSdk.EventRequest
                const UserData = bizSdk.UserData
                const ServerEvent = bizSdk.ServerEvent
                const access_token = integrations.apiToken
                const pixel_id = integrations.apiPixelId
                const api = bizSdk.FacebookAdsApi.init(access_token)
                let current_timestamp = Math.floor(new Date() / 1000)
                const userData = (new UserData())
                    .setFirstName(req.body.firstName)
                    .setLastName(req.body.lastName)
                    .setEmail(req.body.email)
                    .setPhone(req.body.phone && req.body.phone !== '' ? `56${req.body.phone}` : undefined)
                    .setClientIpAddress(req.connection.remoteAddress)
                    .setClientUserAgent(req.headers['user-agent'])
                    .setFbp(req.body.fbp)
                    .setFbc(req.body.fbc)
                const content = (new Content())
                    .setId(req.body.service)
                    .setQuantity(1)
                    .setItemPrice(req.body.price && req.body.price !== '' ? Number(req.body.price) : undefined)
                const customData = (new CustomData())
                    .setContentName(req.body.meeting)
                    .setContents([content])
                    .setCurrency('clp')
                    .setValue(req.body.price && req.body.price !== '' ? Number(req.body.price) : undefined)
                const serverEvent = (new ServerEvent())
                    .setEventId(req.body.eventId)
                    .setEventName('Schedule')
                    .setEventTime(current_timestamp)
                    .setUserData(userData)
                    .setCustomData(customData)
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
            const newMeeting = new Meeting(req.body)
            const newMeetingSave = await newMeeting.save()
            const client = await Client.findOne({ email: req.body.email })
            if (client) {
                await axios.post(`${process.env.API_URL}/clients`, req.body)
            } else {
                const newClient = new Client(req.body)
                await newClient.save()
            }
            res.json(newMeetingSave)
            const clientData = await ClientData.find()
            const storeData = await StoreData.find()
            const style = await Style.find()
            const fechaUtc = moment.utc(req.body.date); // Interpretar como UTC
            const fechaLocal = fechaUtc.tz("America/Santiago")
            await sendEmailBrevo({ subscribers: [{ name: req.body.firstName, email: req.body.email }], emailData: { affair: `¡Hola ${req.body.firstName}! Tu visita ha sido agendada con exito`, title: 'Hemos agendado tu visita exitosamente', paragraph: `¡Hola ${req.body.firstName}! Te queriamos informar que tu visita con fecha ${fechaLocal.date()}/${fechaLocal.month() + 1}/${fechaLocal.year()} a las ${fechaLocal.format("HH:mm")} ha sido agendada con exito, la visita sera en ${req.body.type === 'Visita a domicilio' ? `${req.body.address}, ${req.body.city}, ${req.body.region}.` : `${storeData[0].address}, ${storeData[0].city}, ${storeData[0].region}.`} Para cualquier consulta comunicate con nosotros a través de nuestro Whatsapp.`, buttonText: 'Hablar por Whatsapp', url: `https://wa.me/+56${storeData[0].phone}` }, clientData: clientData, storeData: storeData[0], style: style[0] })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: error.message})
    }
}

export const deleteMeeting = async (req, res) => {
    try {
        const meetingDelete = await Meeting.findOneAndDelete(req.params.id)
        res.json(meetingDelete)
        if (meetingDelete.type === 'Llamada por Zoom') {
            const clientData = await ClientData.find()
            const storeData = await StoreData.find()
            const style = await Style.find()
            await sendEmailBrevo({ subscribers: [{ name: meetingDelete.firstName, email: meetingDelete.email }], emailData: { affair: `Hola ${meetingDelete.firstName}, tu llamada ha sido cancelada`, title: 'Lamentablemente tu llamada ha sido cancelada', paragraph: `Hola ${meetingDelete.firstName}, te queriamos avisar que tu llamada con nosotros ha sido cancelada, para cualquier consulta comunicate con nosotrosa través de nuestro Whatsapp.`, buttonText: 'Hablar por Whatsapp', url: `https://wa.me/+569${storeData[0].phone}` }, clientData: clientData, storeData: storeData[0], style: style[0] })
        } else {
            const clientData = await ClientData.find()
            const storeData = await StoreData.find()
            const style = await Style.find()
            await sendEmailBrevo({ subscribers: [{ name: meetingDelete.firstName, email: meetingDelete.email }], emailData: { affair: `Hola ${meetingDelete.firstName}, tu visita ha sido cancelada`, title: 'Lamentablemente tu visita ha sido cancelada', paragraph: `Hola ${meetingDelete.firstName}, te queriamos avisar que tu visita con nosotros ha sido cancelada, para cualquier consulta comunicate con nosotros a través de nuestro Whatsapp.`, buttonText: 'Hablar por Whatsapp', url: `https://wa.me/+569${storeData[0].phone}` }, clientData: clientData, storeData: storeData[0], style: style[0] })
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find()
        return res.json(meetings)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id)
        return res.json(meeting)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMeetingsEmail = async (req, res) => {
    try {
        const meetings = await Meeting.find({ email: req.params.email })
        return res.json(meetings)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}