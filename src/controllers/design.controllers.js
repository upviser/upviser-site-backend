import Design from '../models/Design.js'
import Funnel from '../models/Funnel.js'
import ClientTag from '../models/ClientTag.js'
import ClientData from '../models/ClientData.js'
import Service from '../models/Service.js'
import Style from '../models/Style.js'
import ChatTag from '../models/ChatTag.js'

export const createDesign = async (req, res) => {
    try {
        const design = await Design.findOne()
        if (design) {
            const designUpdate = await Design.findByIdAndUpdate(design._id, req.body, { new: true })
            return res.send(designUpdate)
        } else {
            const newDesign = new Design(req.body)
            const newDesignSave = await newDesign.save()
            return res.send(newDesignSave)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getDesign = async (req, res) => {
    try {
        const design = await Design.findOne().lean()
        if (design === null) {
            return res.send([])
        }
        return res.send(design)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const updateDesign = async (req, res) => {
    try {
        const updateDesign = await Design.findByIdAndUpdate(req.params.id, req.body, { new: true })
        return res.json(updateDesign)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const editPage = async (req, res) => {
    try {
        const { _id, updatedAt, createdAt, ...updatedData } = req.body;

        // Encuentra la página que necesitas actualizar
        const pageToUpdate = await Design.findOne({ _id: req.params.id, "pages._id": _id });

        if (!pageToUpdate) {
            return res.status(404).json({ message: "Page not found" });
        }

        // Encuentra la página específica dentro del array de pages
        const page = pageToUpdate.pages.id(_id);

        // Actualiza manualmente los campos que necesitas
        Object.assign(page, updatedData);
        page.updatedAt = new Date(); // Actualiza la fecha

        // Guarda el documento actualizado
        await pageToUpdate.save();

        return res.json(pageToUpdate);
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getPagesAndFunnels = async (req, res) => {
    try {
        const design = await Design.findOne();
        const pages = design.pages.filter(page => page.slug !== '').filter(page => page.slug !== 'contacto').filter(page => page.slug !== 'tienda');
        const funnels = await Funnel.find();
        const services = await Service.find()

        // Aplanar los steps de los funnels y unirlos con pages
        const allSteps = funnels.map(funnel => funnel.steps.filter(step => step.slug !== '')).flat();
        const allStepsServices = services.map(service => service.steps.filter(step => step.slug && step.slug !== '')).flat()
        const result = [...pages, ...allSteps, ...allStepsServices];

        return res.json(result)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getPagesFunnels = async (req, res) => {
    try {
        const design = await Design.find()
        if (design[0].pages.find(page => page.slug === req.params.id)) {
            const page = design[0].pages.find(page => page.slug === req.params.id)
            return res.json(page)
        } else {
            const funnels = await Funnel.find()
            if (funnels.find(funnel => funnel.steps.find(step => req.params.id === step.slug))) {
                const step = funnels.find(funnel => funnel.steps.find(step => req.params.id === step.slug)).steps.find(step => step.slug === req.params.id)
                return res.json(step)
            } else {
                const services = await Service.find()
                if (services.map(service => service.steps.find(step => req.params.id === step.slug))) {
                    const step = services.find(service => service.steps.find(step => req.params.id === step.slug)).steps.find(step => step.slug === req.params.id)
                    return res.json(step)
                }
            }
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createDefaultPages = async (req, res) => {
    try {
        const newDesign = new Design({
          header: {
            topStrip: '',
            logo: 'Logo'
          },
          pages: [
            {
              page: 'Inicio',
              slug: '',
              header: true,
              metaTitle: 'Inicio',
              design: [
                { content: 'Carrusel', info: { banner: [{ title: 'Lorem ipsum', description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit.', button: 'Lorem ipsum', buttonLink: '', image: 'https://upviser-website.b-cdn.net/8189.jpg' }], textColor: '#111111' } },
                { content: 'Suscripción', info: { title: 'Suscribete a nuestra lista' } }
              ]
            },
            {
              page: 'Tienda',
              slug: '',
              header: false,
              metaTitle: 'tienda',
              design: [
                { content: 'Bloque 3', info: { title: 'Tienda' } },
                { content: 'Categorias 2', info: { products: '' } },
                { content: 'Productos' }
              ]
            },
            {
              page: 'Blog',
              slug: 'blog',
              header: true
            },
            {
              page: 'Contacto',
              slug: 'contacto',
              header: true,
              metaTitle: 'Contacto',
              design: [
                { content: 'Contacto', info: { title: 'Contacto', description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Consequatur tempora ipsam nesciunt impedit explicabo, alias similique illum neque voluptas nemo eos distinctio vero. Veritatis iste et porro inventore tempore commodi?', titleForm: 'Llena el siguiente formulario' } },
                { content: 'Suscripción', info: { title: 'Suscribete a nuestra lista' } }
              ]
            }
          ],
          footer: { bgColor: '#111111', textColor: '#ffffff' },
          cartPage: { bgColor: '#ffffff', textColor: '#111111', detailsColor: '#ffffff' },
          checkoutPage: { bgColor: '#ffffff', textColor: '#111111', detailsColor: '#ffffff' },
          pageProduct: [{ reviews: true, design: [{ content: 'Carrusel productos' }, { content: 'Suscripción' }] }],
          pageCategory: [{ design: [{ content: 'Bloque 6' }, { content: 'Categorias 2' }, { content: 'Productos' }, { content: 'Suscripción' }] }]
        })
        const newDesignSave = await newDesign.save()
        const newTag = new ClientTag({ tag: 'suscriptores' })
        await newTag.save()
        const newTag2 = new ClientTag({ tag: 'clientes' })
        await newTag2.save()
        const newTag3 = new ClientTag({ tag: 'formulario-contacto' })
        await newTag3.save()
        const newTag4 = new ClientTag({ tag: 'desuscrito' })
        await newTag4.save()
        const newDataFirstName = new ClientData({ name: 'Nombre', data: 'firstName' })
        await newDataFirstName.save()
        const newDataLastName = new ClientData({ name: 'Apellido', data: 'lastName' })
        await newDataLastName.save()
        const newDataEmail = new ClientData({ name: 'Email', data: 'email' })
        await newDataEmail.save()
        const newDataPhone = new ClientData({ name: 'Teléfono', data: 'phone' })
        await newDataPhone.save()
        const newStyle = new Style({ design: 'Ninguno', form: 'Cuadradas', primary: '#2167e5', button: '#ffffff' })
        await newStyle.save()
        const newChatTag1 = new ChatTag({ tag: 'Compra', color: '#00CE1B' })
        await newChatTag1.save()
        const newChatTag2 = new ChatTag({ tag: 'Agente IA', color: '#003CFF' })
        await newChatTag2.save()
        const newChatTag3 = new ChatTag({ tag: 'Productos', color: '#8000FF' })
        await newChatTag3.save()
        const newChatTag4 = new ChatTag({ tag: 'Transferido', color: '#FF6200' })
        await newChatTag4.save()
        return res.json(newDesignSave)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createStyle = async (req, res) => {
    try {
        const style = await Style.findOne()
        if (style) {
            const updateStyle = await Style.findByIdAndUpdate(style._id, req.body, { new: true })
            return res.json(updateStyle)
        } else {
            const newStyle = new Style(req.body)
            const newStyleSave = await newStyle.save()
            return res.json(newStyleSave)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getStyle = async (req, res) => {
    try {
        const style = await Style.findOne()
        return res.json(style)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}