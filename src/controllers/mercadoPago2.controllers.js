import { MercadoPagoConfig, Preference } from "mercadopago"
import Paym from '../models/Payment.js'

export const createOrder = async (req, res) => {
  const paymentData = await Paym.findOne()
  const client = new MercadoPagoConfig({ accessToken: paymentData.mercadoPago.accessToken });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: req.body,
        back_urls: {
          success: `${process.env.WEB_URL}/procesando-pago`,
          pending: `${process.env.WEB_URL}/procesando-pago`,
          failure: `${process.env.WEB_URL}/procesando-pago`,
        },
        auto_return: 'approved'
      }
    }).catch(console.log)

    res.json(result)
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" })
  }
}

export const receiveWebhook = async (req, res) => {
  try {
    return res.json({
      Payment: req.query.payment_id,
      Status: req.query.status,
      MerchantOrder: req.query.merchant_order_id
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Something goes wrong" })
  }
}