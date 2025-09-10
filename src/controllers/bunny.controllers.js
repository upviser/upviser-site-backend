import axios from 'axios';
import fs from 'fs-extra';
import https from 'https'

export const createVideo = async (req, res) => {
  try {
    const fileName = req.body.name || "video.mp4";

    // 1. Crear el video en Bunny
    const response = await axios.post(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY}/videos`,
      { title: fileName },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          AccessKey: process.env.BUNNY_STREAM_ACCESS_KEY,
        },
      }
    );

    const guid = response.data.guid;

    // 2. Generar un upload token
    const tokenResponse = await axios.post(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY}/videos/${guid}/upload`,
      {},
      {
        headers: {
          accept: "application/json",
          AccessKey: process.env.BUNNY_STREAM_ACCESS_KEY,
        },
      }
    );

    const uploadToken = tokenResponse.data.token;

    // 3. Enviar guid y token al cliente
    return res.json({
      guid,
      uploadToken,
      uploadUrl: `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY}/videos/${guid}`,
      embedUrl: `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_STREAM_LIBRARY}/${guid}`,
    });
  } catch (error) {
    console.error("Error creando video en Bunny:", error.response?.data || error.message);
    return res.status(500).json({ message: "Error al crear el video en BunnyCDN" });
  }
};

export const uploadImage = async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'No se ha cargado ninguna imagen.' });
        }

        const filePath = req.files.image.tempFilePath; // Ruta del archivo temporal
        const fileName = req.files.image.name.replace(' ', '-'); // Nombre original del archivo

        const uploadFile = async () => {
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(filePath); // Leer el archivo

                const options = {
                    method: 'PUT',
                    host: 'storage.bunnycdn.com',
                    path: `/${encodeURIComponent(process.env.BUNNY_STORAGE_NAME)}/${encodeURIComponent(fileName)}`, // Ruta de subida en BunnyCDN
                    headers: {
                        accept: 'application/json',
                        AccessKey: process.env.BUNNY_CDN_API, // Clave de acceso BunnyCDN
                        'Content-Type': 'application/octet-stream',
                    },
                };

                const req = https.request(options, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk.toString(); // Acumulamos los datos de la respuesta
                    });

                    res.on('end', () => {
                        if (res.statusCode === 201) { // Si es exitoso (HTTP 201)
                            const imageUrl = `https://${process.env.BUNNY_CDN_NAME}.b-cdn.net/${fileName}`; // URL final de la imagen
                            resolve(imageUrl); // Resolvemos con la URL
                        } else {
                            reject(new Error(`Error en la subida: ${responseData}`)); // Rechazamos si hay error
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error); // Manejo de errores
                });

                readStream.pipe(req); // Enviamos el archivo
            });
        };

        const imageUrl = await uploadFile(); // Esperamos a que se suba la imagen
        await fs.remove(filePath); // Eliminamos el archivo temporal

        return res.json(imageUrl); // Devolvemos la URL de la imagen
    } catch (error) {
        return res.status(500).json({ message: error.message }); // En caso de error
    }
};