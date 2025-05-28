import { Router } from 'express'
import { createOrder, receiveWebhook } from '../controllers/mercadoPago2.controllers.js'

const router = Router()

router.post("/mercado-pago-create", createOrder)

router.post("/mercado-pago-webhook", receiveWebhook)

router.get("/mercado-pago-success", (req, res) => res.send("Success"))

export default router