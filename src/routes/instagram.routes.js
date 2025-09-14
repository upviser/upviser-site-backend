import {Router} from 'express'
import { createMessage, getInstagramIds, getMessagesInstagram, viewMessage, deleteInstagram, changeTag } from '../controllers/instagramMessage.controllers.js'

const router = Router()

router.get('/instagram', getInstagramIds)

router.get('/instagram/:id', getMessagesInstagram)

router.post('/instagram', createMessage)

router.put('/instagram/:id', viewMessage)

router.put('/instagram-tag/:id', changeTag)

router.get('/disconnect-instagram', deleteInstagram)

export default router