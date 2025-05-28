import OpenAI, { toFile } from "openai"
import fs from "fs"
import imageType from "image-type"
import https from 'https'

export const createDescriptionProduct = async (req, res) => {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
          
        const response = await openai.responses.create({
            model: "gpt-4.1",
            input: [
              {
                "role": "system",
                "content": [
                  {
                    "type": "input_text",
                    "text": `Crea descripciones atractivas y detalladas para productos, resaltando sus características, beneficios y cualquier información relevante que pueda ayudar a los consumidores a comprender y valorar el producto, utilizando un tono ${req.body.type}.
                    
# Detalles Adicionales

- Destaca las características únicas e innovadoras del producto.
- Explica los beneficios de usar el producto para el consumidor.
- Incluye información técnica relevante, si aplica, como dimensiones, materiales, y colores.
- Usa un lenguaje persuasivo y accesible que atraiga al público objetivo del producto.

# Steps

1. **Identificación del Producto**: Describe qué es el producto.
2. **Destacar Características y Beneficios**: Enumera características clave y cómo benefician al usuario.
3. **Información Adicional**: Proporciona detalles técnicos importantes o de uso.
4. **Llamada a la Acción**: Motiva al lector a realizar una acción, como comprar o investigar más sobre el producto.

# Output Format

Escribe un párrafo persuasivo que incluya las características, beneficios, y una llamada a la acción al final. El párrafo debe ser claro y atractivo, adaptado al tipo de producto y audiencia.

# Examples

**Ejemplo 1: Reloj Inteligente**

- **Producto**: Reloj Inteligente [Modelo XYZ]
- **Descripción Generada**: "Descubre el futuro en tu muñeca con el Reloj Inteligente Modelo XYZ. Este dispositivo combina elegante diseño con funciones avanzadas como monitoreo de salud en tiempo real, notificaciones inteligentes, y una batería que dura hasta dos semanas. Fabricado con materiales resistentes y una pantalla táctil a todo color, es ideal tanto para el uso diario como para actividades deportivas. Transforma tu día a día comprando el Reloj Inteligente Modelo XYZ y disfruta la tecnología al alcance de tu mano."

**Ejemplo 2: Auriculares Inalámbricos**

- **Producto**: Auriculares Inalámbricos [Modelo ABC]
- **Descripción Generada**: "Potencia tu experiencia de audio con los Auriculares Inalámbricos Modelo ABC. Estos auriculares ofrecen sonido de alta fidelidad, cancelación de ruido activa y conectividad Bluetooth 5.0 para una experiencia auditiva inigualable. Su diseño ergonómico garantiza comodidad durante horas, mientras que su estuche de carga portátil asegura que siempre estés listo para escuchar tu música favorita. No esperes más y vive la libertad sin cables que estos auriculares innovadores te ofrecen."
  
# Notes

- Mantén el tono preciso para el público objetivo.
- Asegúrate de que la descripción sea única y no infrinja derechos de autor.`
                  }
                ]
              },
              {
                "role": "user",
                "content": [
                  {
                    "type": "input_text",
                    "text": req.body.description
                  }
                ]
              }
            ],
            text: {
              "format": {
                "type": "text"
              }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
            store: true
        });
        return res.send(response.output_text)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createSeoProduct = async (req, res) => {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
          
        const responseTitle = await openai.responses.create({
            model: "gpt-4.1",
            input: [
              {
                "role": "system",
                "content": [
                  {
                    "type": "input_text",
                    "text": `Crea metatítulos atractivos y optimizados para productos con un tono ${req.body.type}, teniendo en cuenta elementos clave como el nombre del producto, las características principales y palabras clave relevantes para mejorar su presencia en motores de búsqueda.

# Steps

1. **Identificación del Producto**: Revisa el nombre completo del producto y cualquier característica única que deba resaltarse.
2. **Palabras Clave**: Selecciona palabras clave relevantes basadas en el producto, su industria y términos de búsqueda populares.
3. **Longitud del Metatítulo**: Asegúrate de que el título sea conciso y respetar el límite recomendado de 60 caracteres para SEO.
4. **Redacción**: Crea un título que combine el nombre del producto, sus características distintivas y las palabras clave seleccionadas.
5. **Optimización**: Revisa y ajusta el metatítulo para mejorar su claridad, relevancia, y atracción para los usuarios y motores de búsqueda.

# Output Format

El metatítulo debe ser una sola línea que no exceda los 60 caracteres.

# Examples

**Input:** [Nombre del producto: "Zapatillas deportivas ultra confort"], [Características: "ligeras, transpirables"], [Palabras clave: "zapatillas deportivas confort"]

**Output:** "Zapatillas Ultra Confort: Ligeras y Transpirables" 

# Notes

- Si un producto tiene un nombre demasiado largo, considera abreviaciones o enfoques creativos para mantener el título dentro del límite recomendado.
- Prioriza la claridad y la atracción del título para los usuarios, manteniendo un equilibrio con las necesidades de SEO.`
                  }
                ]
              },
              {
                "role": "user",
                "content": [
                  {
                    "type": "input_text",
                    "text": req.body.description
                  }
                ]
              }
            ],
            text: {
              "format": {
                "type": "text"
              }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
            store: true
        });
        const responseDescription = await openai.responses.create({
            model: "gpt-4.1",
            input: [
              {
                "role": "system",
                "content": [
                  {
                    "type": "input_text",
                    "text": `Crea metadescripciones atractivas y concisas para productos con un tono ${req.body.type}, diseñadas para captar la atención del consumidor y optimizar su búsqueda en motores como Google.

- Asegúrate de que cada descripción sea única y específica para el producto.
- Limita la longitud de la metadescripción a entre 150 y 160 caracteres.
- Destaca características clave, beneficios y, si es relevante, cualquier oferta especial o ventaja competitiva.
- Usa un lenguaje persuasivo que incite a la acción.

# Steps

1. **Identifica las características únicas del producto**: Menciona aspectos como la calidad, el uso, o cualquier atributo destacado.
2. **Enfatiza los beneficios**: Explica qué ganará el consumidor al elegir ese producto.
3. **Considera promociones o ventajas especiales**: Si hay algún descuento, oferta o beneficio adicional, inclúyelo.
4. **Escribe en un lenguaje claro y persuasivo**: Usa un estilo que motive al cliente a hacer clic para más información.

# Output Format

Cada metadescripción debe presentarse en una breve oración de entre 150 y 160 caracteres.

# Examples

**Input**: Zapatos deportivos livianos con tecnología de amortiguación avanzada.

**Output**: "Descubre la comodidad superior con nuestros zapatos deportivos livianos. Tecnología de amortiguación avanzada para más confort en cada paso."

**Input**: Aspiradora potente con diseño sin bolsa y filtro HEPA.

**Output**: "Limpia tu hogar eficazmente con nuestra aspiradora sin bolsa. Potencia y filtro HEPA para un aire más puro."`
                  }
                ]
              },
              {
                "role": "user",
                "content": [
                  {
                    "type": "input_text",
                    "text": req.body.description
                  }
                ]
              }
            ],
            text: {
              "format": {
                "type": "text"
              }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
            store: true
        });
        return res.send({ title: responseTitle.output_text, description: responseDescription.output_text })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createDescriptionCategory = async (req, res) => {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
          
        const response = await openai.responses.create({
            model: "gpt-4.1",
            input: [
              {
                "role": "system",
                "content": [
                  {
                    "type": "input_text",
                    "text": `Crea descripciones detalladas y atractivas para categorías de productos que motiven a los clientes a explorar y considerar productos individuales dentro de cada categoría con un tono ${req.body.type}.

- Observa las características, beneficios y usos comunes de la categoría para capturar la esencia del grupo de productos.
- Enfoca las descripciones en lo que diferencia a la categoría de otras, asegurando que los detalles sean claros y convincentes.
- Mantén un tono amigable y convincente que sea apropiado para la marca o el contexto del producto.
- Limita la extensión a un párrafo completo o más si es necesario para cubrir la información clave de manera efectiva.

# Output Format

La descripción debe ser un párrafo bien estructurado y convincente, utilizando un lenguaje atractivo y preciso que resalte los beneficios y las características clave de la categoría de productos.

# Examples

## Ejemplo 1
### Input: Categoría de productos: "Electrodomésticos de cocina"
### Output: 
Descubre nuestra amplia selección de electrodomésticos de cocina diseñados para simplificar tus tareas culinarias diarias. Desde batidoras de alto rendimiento hasta tostadoras multifunción, cada producto está equipado con tecnología de vanguardia que garantiza durabilidad y eficiencia. Ideal para cocinas de todos los tamaños, nuestros electrodomésticos te permitirán experimentar con novedosas recetas mientras ahorras tiempo y esfuerzo. Elevando tu experiencia culinaria, nuestros productos combinan diseño moderno con funcionalidad excepcional, convirtiéndose en el aliado perfecto para todo amante de la cocina.

## Ejemplo 2
### Input: Categoría de productos: "Ropa deportiva"
### Output: 
Mejora tu rendimiento y redefine tus entrenamientos con nuestra exclusiva colección de ropa deportiva. Cada pieza está diseñada con materiales de alta tecnología que ofrecen transpirabilidad óptima, ajuste ergonómico y libertad de movimiento inigualable. Ya sea que te dediques al yoga, running o entrenamiento en el gimnasio, encontrarás prendas que combinan estilo contemporáneo y funcionalidad, ayudándote a alcanzar tus objetivos con comodidad y confianza. Con una paleta de colores vibrante y estilos innovadores, nuestra línea deportiva te acompaña en cada paso de tu camino hacia una vida más activa.

# Notes

- Asegúrate de adaptar las descripciones al público objetivo y contexto cultural de la audiencia.
- Considera incluir llamados a la acción o preguntas retóricas para incentivar una respuesta positiva hacia la categoría.
- Evita el uso de tecnicismos o jergas excesivas a menos que sean apropiadas para la audiencia esperada.`
                  }
                ]
              },
              {
                "role": "user",
                "content": [
                  {
                    "type": "input_text",
                    "text": req.body.description
                  }
                ]
              }
            ],
            text: {
              "format": {
                "type": "text"
              }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
            store: true
        });
        return res.send(response.output_text)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createSeoCategory = async (req, res) => {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
          
        const responseTitle = await openai.responses.create({
            model: "gpt-4.1",
            input: [
              {
                "role": "system",
                "content": [
                  {
                    "type": "input_text",
                    "text": `Crea metatítulos efectivos para categorías de productos describiendo de manera concisa y atractiva cada categoría con un tono ${req.body.type}.

- Asegúrate de captar el interés del usuario en menos de 60 caracteres.
- Incluye palabras clave relevantes para mejorar el SEO.
- Mantén un estilo claro y directo que refleje el producto y la categoría.

# Steps

1. Identifica la categoría de producto.
2. Determina las palabras clave más importantes relacionadas con la categoría.
3. Redacta un título breve que indique la categoría y las palabras clave de forma atractiva.
4. Revisa y ajusta para asegurarte de que cumple con el límite de caracteres y es fácil de entender.

# Output Format

La salida debe consistir en un metatítulo de menos de 60 caracteres que refleje claramente la categoría del producto e incluya las palabras clave.

# Examples

**Input:** Categoría de producto: "Ropa deportiva"
   
**Process:** 
   - Identifica palabras clave: "Ropa deportiva", "ejercicio", "comodidad"
   - Redacta el metatítulo: "Ropa Deportiva: Estilo y Comodidad para el Ejercicio"

**Output:** "Ropa Deportiva: Estilo y Comodidad"

# Notes

- Considera variaciones de palabras clave que los usuarios podrían usar al buscar productos.
- Evita jergas o términos muy técnicos que sean poco claros para el usuario promedio.`
                  }
                ]
              },
              {
                "role": "user",
                "content": [
                  {
                    "type": "input_text",
                    "text": req.body.description
                  }
                ]
              }
            ],
            text: {
              "format": {
                "type": "text"
              }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
            store: true
        });
        const responseDescription = await openai.responses.create({
            model: "gpt-4.1",
            input: [
              {
                "role": "system",
                "content": [
                  {
                    "type": "input_text",
                    "text": `Crear metadescripciones para categorías de productos en un sitio web de comercio electrónico con un tono ${req.body.type}.

Debe incluir el nombre de la categoría y un resumen atractivo que invite al usuario a explorar los productos. Las metadescripciones deben ser cortas, claras y llamar la atención. Evita las descripciones genéricas y asegúrate de destacar las características únicas o los beneficios de los productos en la categoría.

# Pasos

1. **Identificar el nombre de la categoría:** Asegúrate de que esté claro y relevante para los productos que contiene.
2. **Resumir el contenido de la categoría:** Proporciona un breve resumen de los productos, destacando características clave, beneficios y singularidades.
3. **Incluir llamados a la acción:** Incorpora expresiones que inviten a los usuarios a explorar más.
4. **Limitar la longitud de la descripción:** Asegúrate de que la metadescripción no supere los 160 caracteres para garantizar que se muestre completa en los motores de búsqueda.

# Formato de Salida

Proporciona la metadescripción en una oración concisa con un máximo de 160 caracteres.

# Ejemplos

**Input:** Categoría: "Zapatos Deportivos"

**Output:** "Descubre nuestra colección de zapatos deportivos para un rendimiento óptimo. Estilo y comodidad en cada paso."

**Input:** Categoría: "Productos de Belleza Orgánica"

**Output:** "Explora la belleza natural con nuestros productos orgánicos. Cuida tu piel con lo mejor de la naturaleza."`
                  }
                ]
              },
              {
                "role": "user",
                "content": [
                  {
                    "type": "input_text",
                    "text": req.body.description
                  }
                ]
              }
            ],
            text: {
              "format": {
                "type": "text"
              }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
            store: true
        });
        return res.send({ title: responseTitle.output_text, description: responseDescription.output_text })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createImageProduct = async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'No se ha cargado ninguna imagen.' });
        }
        const filePath = req.files.image.tempFilePath
        const fileName = req.files.image.name.replace(' ', '-')
        const buffer = fs.readFileSync(filePath);
        const type = await imageType(buffer)
        if (!type) {
            return res.status(400).json({ message: 'Formato de imagen no soportado.' });
        }
        const mimeType = type.mime
        const image = await toFile(fs.createReadStream(filePath), null, {
            type: mimeType,
        })
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
        const rsp = await client.images.edit({
            model: "gpt-image-1",
            image: [image],
            prompt: `Crea una imagen realista del producto en base a la foto del producto y a la siguiente descripción: ${req.body.description}`,
            size: "1024x1024",
            quality: "medium",
        })
        const image_base64 = rsp.data[0].b64_json
        const image_bytes = Buffer.from(image_base64, "base64")
        const uploadToBunny = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    method: 'PUT',
                    host: 'storage.bunnycdn.com',
                    path: `/${encodeURIComponent(process.env.BUNNY_STORAGE_NAME)}/${encodeURIComponent(fileName)}`,
                    headers: {
                        accept: 'application/json',
                        AccessKey: process.env.BUNNY_CDN_API,
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': image_bytes.length,
                    },
                }
                const reqBunny = https.request(options, (resBunny) => {
                    let responseData = ''
                    resBunny.on('data', (chunk) => {
                        responseData += chunk.toString();
                    })
                    resBunny.on('end', () => {
                        if (resBunny.statusCode === 201) {
                            const imageUrl = `https://${process.env.BUNNY_CDN_NAME}.b-cdn.net/${fileName}`;
                            resolve(imageUrl)
                        } else {
                            reject(new Error(`Error en la subida: ${responseData}`))
                        }
                    })
                })
                reqBunny.on('error', (error) => {
                    reject(error)
                })
                reqBunny.write(image_bytes)
                reqBunny.end()
            })
        }
        const imageUrl = await uploadToBunny()
        await fs.promises.unlink(filePath)
        return res.json(imageUrl)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}