import {Router} from 'express'
import { createUser, getUser } from '../controllers/user.controllers.js'

const router = Router()

router.post('/user', createUser)

router.get('/user-api/:api', getUser)

export default router