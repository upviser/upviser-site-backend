import {Router} from 'express'
import { createWebhook, getMessage, callbackFacebook } from '../controllers/webhook.controllers.js'

const router = Router()

router.get('/webhook', createWebhook)

router.post('/webhook', getMessage)

router.get('/auth/facebook/callback', callbackFacebook)

export default router