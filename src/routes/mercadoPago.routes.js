import { Router } from 'express'
import { createPay, createSuscribe } from '../controllers/mercadoPago.controllers.js'

const router = Router()

router.post('/process_payment', createPay)

router.post('/suscribe', createSuscribe)

export default router