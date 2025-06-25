import brevo from '@getbrevo/brevo'
import { updateClientEmailStatus } from '../utils/updateEmail.js'
import ShopLogin from '../models/ShopLogin.js'

export const sendEmailBrevo = async ({ subscribers, emailData, clientData, storeData, automatizationId, style }) => {

    let apiInstance = new brevo.TransactionalEmailsApi()

    let apiKey = apiInstance.authentications['apiKey']
    apiKey.apiKey = process.env.BREVO_API

    const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const createDataMap = (subscriber, clientData) => {
        const dataMap = { ...subscriber }
        clientData.forEach(item => {
            if (!dataMap[item.data]) {
                dataMap[item.data] = subscriber.data?.find(dat => dat.name === item.data)?.value ? subscriber.data.find(dat => dat.name === item.data).value : ''
            }
        })
        return dataMap
    };
    
    const replacePlaceholders = (text, data) => {
        return Object.keys(data).reduce((result, key) => {
            const placeholder = new RegExp(`{${key}}`, 'g')
            return result.replace(placeholder, data[key])
        }, text)
    };

    subscribers.map(async (subscriber) => {
        const dataMap = createDataMap(subscriber._doc || subscriber, clientData)
        let sendSmtpEmail = new brevo.SendSmtpEmail()
        sendSmtpEmail = {
            sender: { email: process.env.BREVO_EMAIL, name: process.env.BREVO_NAME },
            subject: replacePlaceholders(emailData.affair, dataMap),
            to: [{
                email: subscriber.email,
                name: subscriber.firstName
            }],
            htmlContent: `
                <div lang="und" style="width:100%;padding:0;Margin:0;background-color:#ffffff;font-family:roboto,'helvetica neue',helvetica,arial,sans-serif;">
                    <table style="width: 100%; border-collapse: collapse; border-spacing: 0px; padding: 0; margin: 0; height: 100%; background-repeat: repeat; background-position: center top; background-color: #ffffff;">
                        <tbody><tr><td>
                            <table style="border-collapse: collapse; border-spacing: 0px; table-layout: fixed !important; width: 100%;">
                                <tbody><tr><td align="center">
                                    <table style="border-collapse: collapse; border-spacing: 0px; background-color: transparent; width: 100%; max-width: 650px;">
                                        <tbody><tr><td>
                                            <table style="border-collapse: collapse; border-spacing: 0px; width: 100%;">
                                                <tbody>
                                                    ${storeData.logo && storeData.logo !== ''
                                                        ? `
                                                            <tr>
                                                                <td align="center" style="padding: 20px;">
                                                                    <a href="${process.env.WEB_URL}" target="_blank"><img src="${storeData.logo}" alt="Logo" style="width: 150px;" /><a/>
                                                                </td>
                                                            </tr>
                                                            <td align="center" style="Margin:0;font-size:0">
                                                                <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px">
                                                                    <tbody><tr><td style="padding:0;Margin:0;border-bottom:1px solid #cccccc;background:unset;height:1px;width:100%;margin:0px">
                                                                    </td></tr></tbody>
                                                                </table>
                                                            </td>
                                                        `
                                                        : ''
                                                    }
                                                    <tr>
                                                        <td align="center" style="padding: 20px;">
                                                            ${emailData.title && emailData.title !== ''
                                                                ? `
                                                                    <h1 style="margin: 0; color: #333333; font-weight: 500;">${replacePlaceholders(emailData.title, dataMap)}</h1>
                                                                    <br>
                                                                `
                                                                : ''
                                                            }
                                                            <p style="margin: 0;${emailData.buttonText && emailData.buttonText !== '' && emailData.url && emailData.url !== '' ? 'padding-bottom: 10px;' : ''} line-height: 25px; color: #333333; font-size: 16px;">${replacePlaceholders(emailData.paragraph, dataMap)}</p>
                                                            ${emailData.buttonText && emailData.buttonText !== '' && emailData.url && emailData.url !== ''
                                                                ? `
                                                                    <br>
                                                                    <a href="${replacePlaceholders(emailData.url, dataMap)}" style="padding: 10px 30px; background-color: ${style?.primary}; border: none; color: ${style?.button}; border-radius: ${style?.form !== 'Cuadradas' ? `${style?.borderButton}px` : '0px'}; font-size: 15px; text-decoration: none;">${emailData.buttonText}</a>
                                                                `
                                                                : ''
                                                            }
                                                        </td>
                                                    </tr>
                                                    <td align="center" style="margin:0;font-size:0;${emailData.buttonText && emailData.buttonText !== '' && emailData.url && emailData.url !== '' ? 'padding-top: 10px;' : ''}">
                                                        <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px">
                                                            <tbody><tr><td style="padding:0;Margin:0;border-bottom:1px solid #cccccc;background:unset;height:1px;width:100%;margin:0px;">
                                                            </td></td></tbody>
                                                        </table>
                                                    </td>
                                                    <tr>
                                                        <td align="center" style="padding-bottom: 20px; padding-top: 10px;">
                                                            <p style="margin: 0; padding-bottom: 10px; font-size: 12px; color: #444444;padding-bottom: 10px;">Enviado a: ${subscriber.email}</p>
                                                            <a href="${process.env.API_URL}/desubcribe/${subscriber.email}" style="margin: 0; padding-bottom: 10px; font-size: 12px; color: #444444;">Desuscribirte</a>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td></tr></tbody>
                                    </table>
                                </td></tr></tbody>
                            </table>
                        </td></tr></tbody>
                    </table>
                </div>
            `,
            tags: [id]
        };
        await updateClientEmailStatus(subscriber.email, {
            id: id,
            automatizationId: automatizationId,
            subject: emailData.affair,
            opened: false,
            clicked: false
        });
        const shopLogin = await ShopLogin.findOne({ type: 'Administrador' })
        if (shopLogin.emails > 0) {
            const data = await apiInstance.sendTransacEmail(sendSmtpEmail)
            console.log('API called successfully. Returned data: ' + JSON.stringify(data));
            await ShopLogin.findByIdAndUpdate(shopLogin._id, { emails: shopLogin.emails - 1 })
        }
    })
}