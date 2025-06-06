import brevo from '@getbrevo/brevo'
import { updateClientEmailStatus } from '../utils/updateEmail.js'
import { NumberFormat } from '../utils/NumberFormat.js'

export const sendEmailBuyBrevo = async ({ storeData, style, sell, pay, services }) => {

    let apiInstance = new brevo.TransactionalEmailsApi()

    let apiKey = apiInstance.authentications['apiKey']
    apiKey.apiKey = process.env.BREVO_API

    const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    let service

    if (pay?.email) {
        service = services.find(service => service._id === pay.service)
    }

    let sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail = {
        sender: { email: process.env.BREVO_EMAIL, name: process.env.BREVO_NAME },
        subject: `¡Hola ${sell?.firstName ? sell.firstName : pay.firstName}! Tu compra ha sido realizada con exito`,
        to: [{
            email: sell?.email ? sell.email : pay.email,
            name: sell?.firstName ? sell.firstName : pay.firstName
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
                                                        <h1 style="margin: 0; color: #333333; font-weight: 500;">Aqui te dejamos los detalles de tu compra</h1>
                                                        <br>
                                                    </td>
                                                </tr>
                                                ${
                                                    sell?.email
                                                        ? `
                                                            <div style="color: #2D2D2D;">
                                                                ${sell.cart.map(product => {
                                                                    return `
                                                                        <div key={product._id} style="display: flex;">
                                                                            <img src=${product.image} style="width: 100px; height: 100px; margin-right: 6px; border: 1px solid #B9B9B9; border-radius: 6px;" />
                                                                            <div>
                                                                                <p style="font-size: 16px;">${product.name}</p>
                                                                                <p style="font-size: 16px;">Cantidad: ${product.quantity}</p>
                                                                            </div>
                                                                            <p style="font-size: 16px; margin-left: auto; margin-top: auto; margin-bottom: auto;">$${NumberFormat(product.price)}</p>
                                                                        </div>
                                                                    `
                                                                })}
                                                                <p style="font-size: 16px;">Envío: $${NumberFormat(sell.shipping)}</p>
                                                                <p style="font-size: 16px;">Total: $${NumberFormat(sell.cart.reduce((prev, curr) => curr.price * curr.quantity + prev, 0) + Number(sell.shipping))}</p>
                                                            </div>
                                                        `
                                                        : `
                                                            <tr>
                                                                <td align="center" style="padding: 20px;">
                                                                    <p style="margin: 0; padding-bottom: 10px; line-height: 25px; color: #333333; font-size: 16px;">Servicio: ${service?.name}</p>
                                                                    <br>
                                                                    ${
                                                                        pay?.plan && pay.plan !== ''
                                                                            ? `
                                                                                <p style="margin: 0; padding-bottom: 10px; line-height: 25px; color: #333333; font-size: 16px;">Plan: ${service?.plans?.plans?.find(plan => plan._id === pay.plan).name}</p>
                                                                                <br>
                                                                            `
                                                                            : ''
                                                                    }
                                                                    <p style="margin: 0; padding-bottom: 10px; line-height: 25px; color: #333333; font-size: 16px;">Modalidad de pago: ${pay.typePrice}</p>
                                                                    <br>
                                                                    <p style="margin: 0; padding-bottom: 10px; line-height: 25px; color: #333333; font-size: 16px;">Precio total: $${NumberFormat(Number(pay.price))}</p>
                                                                </td>
                                                            </tr>
                                                        `
                                                }
                                                <tr>
                                                    <td align="center" style="padding: 20px;">
                                                        <p style="margin: 0; padding-bottom: 10px; line-height: 25px; color: #333333; font-size: 16px;">Para cualquier consulta comunicate con nostros a través de nuestro Whatsapp.</p>
                                                        <br>
                                                        <a href="https://api.whatsapp.com/send?phone=56${storeData?.phone}" style="padding: 10px 30px; background-color: ${style?.primary}; border: none; color: ${style?.button}; border-radius: ${style?.form !== 'Cuadradas' ? `${style?.borderButton}px` : '0px'}; font-size: 15px; text-decoration: none;">Hablar por Whatsapp</a>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="center" style="padding-bottom: 20px; padding-top: 10px;">
                                                        <p style="margin: 0; padding-bottom: 10px; font-size: 12px; color: #444444;padding-bottom: 10px;">Enviado a: ${sell?.email ? sell.email : pay.email}</p>
                                                        <a href="${process.env.API_URL}/desubcribe/${sell?.email ? sell.email : pay?.email}" style="margin: 0; padding-bottom: 10px; font-size: 12px; color: #444444;">Desuscribirte</a>
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
    await updateClientEmailStatus(sell?.email ? sell.email : pay?.email, {
        id: id,
        subject: `¡Hola ${sell?.firstName ? sell.firstName : pay?.firstName}! Tu compra ha sido realizada con exito`,
        opened: false,
        clicked: false
    });
    apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
        console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function (error) {
        console.error(error);
    });
}