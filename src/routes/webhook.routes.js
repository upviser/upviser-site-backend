import {Router} from 'express'
import { createWebhook, getMessage, callbackFacebook, deleteData, deleteStatus } from '../controllers/webhook.controllers.js'

const router = Router()

router.get('/webhook', createWebhook)

router.post('/webhook', getMessage)

router.get('/auth/facebook/callback', callbackFacebook)

router.get('/auth/facebook/delete-data', deleteData)

router.get('/delete-status', deleteStatus)

export default router