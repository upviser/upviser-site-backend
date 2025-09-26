import { updateClientEmailStatusById } from '../utils/updateEmail.js'

export const getStatus = async (req, res) => {
    console.log(req.body)
    const event = req.body.event;
    const email = req.body.email
    const emailId = req.body.tags[0]
    
    if (event === 'unique_opened') {
        await updateClientEmailStatusById(email, emailId, 'unique_opened');
    } else if (event === 'click') {
        await updateClientEmailStatusById(email, emailId, 'click');
    }

    res.status(200).send('Webhook received');
}