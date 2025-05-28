import brevo from '@getbrevo/brevo'
import { updateClientEmailStatus } from '../utils/updateEmail.js'

export const sendEmail = async ({ subscribers, affair, title, paragraph, buttonText, url, storeData, date }) => {

    let apiInstance = new brevo.TransactionalEmailsApi();

    let apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API;

    let sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = affair;
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
                    .div-button {
                        margin-top: 19px;
                        margin-bottom: 9px;
                    }
                    .button {
                        border-radius: 4px;
                        padding: 9px 16px;
                        background-color: #0071E3;
                        text-decoration: none;
                        text-transform: none;
                        font-weight: 600;
                        font-size: 14px;
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
                                <h1 class="email-body-h1">${title}</h1>
                                <p class="email-p">${paragraph}</p>
                                <div class="div-button">
                                    <a class="button" style="color: #ffffff;" href="${url}">${buttonText}</a>
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
    sendSmtpEmail.to = subscribers.map(subscriber => ({
        email: subscriber.email,
        name: subscriber.firstName
    }));
    const uniqueId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sendSmtpEmail.headers = { "X-Unique-Id": uniqueId };
    sendSmtpEmail.params = { "parameter": "My param value", "subject": "common subject" };
    sendSmtpEmail.scheduledAt = date

    subscribers.map(async subscriber => {
        await updateClientEmailStatus(subscriber.email, {
            id: uniqueId,
            subject: affair,
            opened: false,
            clicked: false
        });
    })

    apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
        console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function (error) {
        console.error(error);
    });
}