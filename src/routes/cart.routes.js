import { Router } from 'express'
import { getCart } from '../controllers/cart.controllers.js'

const router = Router()

router.get('/cart/:id', getCart)

export default router