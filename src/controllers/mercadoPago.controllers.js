import { MercadoPagoConfig, Payment, PreApproval } from 'mercadopago';
import Paym from '../models/Payment.js'

export const createPay = async (req, res) => {
    try {
        const paymentData = await Paym.findOne()
        const client = new MercadoPagoConfig({ accessToken: paymentData.mercadoPago.accessToken, options: { timeout: 5000 } });
        const payment = new Payment(client);
        payment.create({ body: req.body })
            .then(async (response) => {
                return res.json(response)
            })
            .catch(async (error) => {
                console.log(error)
                return res.status(500).json({message: error.message})
            })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
    
}

export const createSuscribe = async (req, res) => {
    try {
        const paymentData = await Paym.findOne()
        const client = new MercadoPagoConfig({ accessToken: paymentData.mercadoPagoSuscription.accessToken, options: { timeout: 5000 } });
        const preapproval = new PreApproval(client);
        const body = {
            reason: `Suscripción ${req.body.frequency}`,
            payer_email: req.body.email,
            card_token_id: req.body.cardToken,
            auto_recurring: {
                frequency: 1,
                frequency_type: req.body.frequency === 'Mensual' ? 'months' : 'years',
                transaction_amount: req.body.price,
                currency_id: 'CLP',
                start_date: new Date()
            },
            back_url: `${process.env.WEB_URL}/gracias-por-comprar`,
            status: 'authorized'
        };

        const response = await preapproval.create({ body });
        return res.json(response.body);
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
