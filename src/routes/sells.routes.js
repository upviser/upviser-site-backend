import {Router} from 'express'
import {createSell, getSells, getSell, getSellEmail, updateSell, getSellByEmail, updatedSell} from '../controllers/sell.controllers.js'

const router = Router()

router.post('/sells', createSell)

router.get('/sells', getSells)

router.get('/sells/:id', getSell)

router.get('/sell/:email', getSellEmail)

router.put('/sells/:id', updateSell)

router.put('/sell/:id', updatedSell)

router.get('/sells-client/:id', getSellByEmail)

export default router