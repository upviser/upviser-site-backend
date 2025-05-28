import {Router} from 'express'
import {createInformation, getInformation} from '../controllers/Information.controllers.js'

const router = Router()

router.post('/information', createInformation)

router.get('/information', getInformation)

export default router