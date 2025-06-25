import {Router} from 'express'
import { createAccount, editAccountData, getAccountData, getAccounts, getAccountAdmin, editAccountAdmin } from '../controllers/shopLogin.controllers.js'

const router = Router()

router.post('/shop-login', createAccount)

router.get('/shop-login', getAccountData)

router.put('/shop-login', editAccountData)

router.get('/accounts', getAccounts)

router.get('/shop-login-admin', getAccountAdmin)

router.put('/shop-login-admin', editAccountAdmin)

export default router