import pkg from 'transbank-sdk'
import {asyncHandler} from '../utils/async_handler.js'
const { WebpayPlus, Environment, Options } = pkg
import StoreData from '../models/StoreData.js'
import Pay from '../models/Pay.js'
import Payment from '../models/Payment.js'

export const create = asyncHandler(async function (req, res) {
  const { amount, returnUrl } = req.body
  const pay = await Pay.countDocuments()
  const storeData = await StoreData.findOne().lean()
  const buyOrder = `${storeData.name !== '' ? storeData.name : 'WEB'}-${pay + 1001}`
  const sessionId = `P-${1001 + Number(pay)}`
  const payment = await Payment.findOne().lean()
  // const createResponse = await (new WebpayPlus.Transaction(new Options(payment.transbank.commerceCode, payment.transbank.apiKey, Environment.Integration))).create(
  const createResponse = await (new WebpayPlus.Transaction(new Options(597055555532, '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C', Environment.Integration))).create(
    buyOrder,
    sessionId,
    amount,
    returnUrl
  )
  return res.send(createResponse)
})

export const commit = asyncHandler(async function (req, res) {
  try {
    let { token } = req.body
    const payment = await Payment.findOne().lean()
    // const commitResponse = await (new WebpayPlus.Transaction(new Options(payment.transbank.commerceCode, payment.transbank.apiKey, Environment.Integration))).commit(token)
    const commitResponse = await (new WebpayPlus.Transaction(new Options(597055555532, '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C', Environment.Integration))).commit(token)
    res.send(commitResponse)
  } catch (error) {
    return res.status(204).json({message: 'Pago no realizado'})
  }
})

export const status = asyncHandler(async function (req, res) {
  let { token } = req.body
  const statusResponse = await (new WebpayPlus.Transaction()).status(token)
  let viewData = {
    token,
    statusResponse,
  }
  res.send(viewData)
})

export const refund = asyncHandler(async function (req, res) {
  let { token, amount } = req.body
  const refundResponse = await (new WebpayPlus.Transaction()).refund(token, amount)
  let viewData = {
    token,
    amount,
    refundResponse,
  }
  res.send(viewData)
})