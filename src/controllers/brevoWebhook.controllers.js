import { updateClientEmailStatusById } from '../utils/updateEmail.js'
import User from '../models/User.js'
import axios from 'axios';

export const getStatus = async (req, res) => {
    const event = req.body.event;
    const email = req.body.email
    const emailId = req.body.tags[0]
    const senderEmail = req.body.sender_email

    if (senderEmail !== process.env.BREVO_EMAIL) {
        const user = await User.findOne({ email: senderEmail }).lean()
        if (!user) return res.status(200).send('Webhook received');
        await axios.post(`${user.api}/brevo-webhook`, req.body)
        return res.status(200).send('Webhook received');
    }
    
    if (event === 'unique_opened') {
        await updateClientEmailStatusById(email, emailId, 'unique_opened');
    } else if (event === 'click') {
        await updateClientEmailStatusById(email, emailId, 'click');
    }

    res.status(200).send('Webhook received');
}