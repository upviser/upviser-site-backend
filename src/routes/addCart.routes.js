import {Router} from 'express'
import {createAddCart, getAddCart} from '../controllers/addCart.controllers.js'

const router = Router()

router.post('/add-cart', createAddCart)

router.get('/add-cart', getAddCart)

export default router