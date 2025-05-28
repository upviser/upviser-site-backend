import { NumberFormat } from '../utils/NumberFormat.js'
import brevo from '@getbrevo/brevo'
import { updateClientEmailStatus } from '../utils/updateEmail.js'

export const sendEmailBuy = async ({ sell, storeData }) => {

    let apiInstance = new brevo.TransactionalEmailsApi();

    let apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API;

    let sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = `¡Hola ${sell.firstName}! Tu compra ha sido realizada con exito`;
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="x-apple-disable-message-reformatting">
                <title>Your Email Title</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }
                    table, td, div, h1, p {
                        font-family: Arial, sans-serif;
                    }
                    .email-container {
                        width: 100%;
                        max-width: 600px;
                        margin: auto;
                        background-color: #ffffff;
                    }
                    .email-header {
                        padding-top: 20px;
                        padding-left: 20px;
                        padding-right: 20px;
                        padding-bottom: 0px;
                        text-align: center;
                    }
                    .email-logo {
                        width: 230px;
                    }
                    .email-body {
                        padding: 20px;
                        border-bottom: 1px solid #e1e4e7;
                    }
                    .email-body-h1 {
                        margin-top: 0px;
                        margin-bottom: 10px;
                        font-size: 26px;
                    }
                    .email-p {
                        font-size: 14px;
                        margin-top: 0px;
                        margin-bottom: 10px;
                    }
                    .email-footer {
                        padding: 20px;
                        text-align: center;
                    }
                    .email-footer-p {
                        margin-top: 0px;
                        margin-bottom: 10px;
                    }
                    .email-footer-a {
                        margin: 0px;
                    }
                </style>
            </head>
            <body>
                <center>
                    <table role="presentation" class="email-container">
                        <tr>
                            <td class="email-header">
                                <img class="email-logo" src="${storeData.logo.url}" alt="Logo ${storeData.name}" />
                            </td>
                        </tr>
                        <tr>
                            <td class="email-body">
                                <h1 class="email-body-h1">Aqui te dejamos los detalles de tu compra</h1>
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
                            </td>
                        </tr>
                        <tr>
                            <td class="email-footer">
                                <p class="email-footer-p">© 2024 ${storeData.name}. Todos los derechos reservados.</p>
                                <p class="email-footer-a"><a href="https://yourcompany.com/unsubscribe">Anular suscripción</a></p>
                            </td>
                        </tr>
                    </table>
                </center>
            </body>
        </html>
    `
    sendSmtpEmail.sender = { email: 'contacto@upvisor.cl', name: 'Jorge Tapia' }
    sendSmtpEmail.to = [{
        email: sell.email,
        name: sell.firstName
    }];
    const uniqueId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sendSmtpEmail.headers = { "X-Unique-Id": uniqueId };
    sendSmtpEmail.params = { "parameter": "My param value", "subject": "common subject" };

    await updateClientEmailStatus(sell.email, {
        id: uniqueId,
        subject: affair,
        opened: false,
        clicked: false
    });

    apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
        console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function (error) {
        console.error(error);
    });
}