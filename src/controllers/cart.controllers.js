import Cart from '../models/Cart.js'

export const getCart = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Se requiere un identificador (id) en la ruta' });
        }

        // Define dinámicamente el campo a usar en la consulta
        const filter = {
            $or: [
                { phone: id },
                { messengerId: id },
                { instagramId: id }
            ]
        };

        const cart = await Cart.findOne(filter).exec();

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        return res.json({ cart });
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}