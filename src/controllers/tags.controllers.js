import Tag from '../models/Tag.js'

export const createTag = async (req, res) => {
    try {
        const {tag} = req.body
        const newTag = new Tag({tag: tag})
        await newTag.save()
        return res.json(newTag)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getTags = async (req, res) => {
    try {
        const tags = await Tag.find()
        return res.json(tags)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}