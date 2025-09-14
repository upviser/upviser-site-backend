import {Router} from 'express'
import { getPhones, getMessagesPhone, newMessage, viewMessage, changeTag, createTemplate, deleteTemplate, editTemplate, getTemplates, whatsappToken, DisconnectWhatsapp } from '../controllers/whatsappMessages.js'

const router = Router()

router.get('/whatsapp', getPhones)

router.get('/whatsapp/:id', getMessagesPhone)

router.post('/whatsapp', newMessage)

router.put('/whatsapp/:id', viewMessage)

router.put('/whatsapp-tag/:id', changeTag)

router.post('/whatsapp-token', whatsappToken)

router.post('/whatsapp-template', createTemplate)

router.delete('/whatsapp-template/:name', deleteTemplate)

router.get('/whatsapp-templates', getTemplates)

router.post('/edit-template', editTemplate)

router.delete('/delete-whatsapp', DisconnectWhatsapp)

export default router