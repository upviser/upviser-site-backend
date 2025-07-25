import { Router } from 'express'
import { createToken, zoomCallback, redirectZoom } from '../controllers/zoom.controllers.js'

const router = Router()

router.get('/zoom-token', createToken)

router.get('/auth/zoom', redirectZoom)

router.get('/zoom/callback', zoomCallback)

export default router