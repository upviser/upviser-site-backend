import {Router} from 'express'
import { getPhones, getMessagesPhone, newMessage, viewMessage } from '../controllers/whatsappMessages.js'

const router = Router()

router.get('/whatsapp', getPhones)

router.get('/whatsapp/:id', getMessagesPhone)

router.post('/whatsapp', newMessage)

router.put('/whatsapp/:id', viewMessage)

export default router