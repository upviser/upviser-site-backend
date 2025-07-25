import axios from 'axios'
import Integrations from '../models/Integrations.js'
import User from '../models/User.js'

export const createToken = async (req, res) => {
    try {
        const integrations = await Integrations.findOne().lean()
        const response = await axios.post('https://zoom.us/oauth/token', null, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
                "grant_type": "account_credentials",
                "account_id": integrations.zoomAccountId
            }
        })
        await Integrations.findByIdAndUpdate(integrations._id, { zoomToken: response.data.access_token, zoomExpiresIn: response.data.expires_in, zoomCreateToken: new Date() })
        return res.json(response.data)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const redirectZoom = async (req, res) => {
    const authUrl = `https://zoom.us/oauth/authorize?response_type=code`
        + `&client_id=${process.env.ZOOM_CLIENT_ID}`
        + `&redirect_uri=${encodeURIComponent(process.env.ZOOM_REDIRECT_URI)}`;
    res.redirect(authUrl);
}

export const zoomCallback = async (req, res) => {
  const { code, error, state } = req.query;
  if (error) return res.status(400).send(`OAuth Error: ${error}`);
  if (!code) return res.status(400).send('Authorization code missing.');

  try {
    const tokenResp = await axios.post(
      'https://zoom.us/oauth/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI
      }),
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, expires_in } = tokenResp.data;

    // Obtener info de usuario conectado
    const userResp = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { account_id: zoomAccountId } = userResp.data;

    if (state) {
        const user = await User.findOne({ state: state })
        if (user) await axios.post(`${user.api}/integrations`, { zoomAccountId: zoomAccountId, zoomToken: access_token, zoomExpiresIn: expires_in, zoomCreateToken: new Date() })
    } else {
        await Integrations.findOneAndUpdate({ zoomAccountId: zoomAccountId, zoomToken: access_token, zoomExpiresIn: expires_in, zoomCreateToken: new Date() })
    }

    res.json({ success: 'OK' });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send('Error al obtener tokens o info de usuario.');
  }
}