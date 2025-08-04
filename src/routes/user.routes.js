import {Router} from 'express'
import { createUser, getUser, getUsers } from '../controllers/user.controllers.js'

const router = Router()

router.post('/user', createUser)

router.get('/user-api/:api', getUser)

router.get('/users', getUsers)

export default router