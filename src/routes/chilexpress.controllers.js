import { Router } from 'express'
import { createChilexpress, editChilexpress, getChilexpress } from '../controllers/chilexpress.controllers.js'

const router = Router()

router.post('/chilexpress', createChilexpress)

router.put('/chilexpress/:id', editChilexpress)

router.get('/chilexpress', getChilexpress)

export default router