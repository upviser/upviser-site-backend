import Client from '../models/Client.js'

export const updateClientEmailStatus = async (email, emailData) => {
    await Client.findOneAndUpdate(
        { email: email },
        { $push: { emails: emailData } }
    );
};

export const updateClientEmailStatusById = async (email, emailId, updateData) => {
    const client = await Client.findOne({ email: email })
    let emailUpdate = client.emails.find(email => email.id === emailId)
    if (updateData === 'unique_opened' && emailUpdate) {
        emailUpdate.opened = true
    } else if (updateData === 'click' && emailUpdate) {
        emailUpdate.clicked = true
    }
    await client.save()
};