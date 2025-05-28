import Category from "../models/Category.js"

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().lean()
    return res.send(categories)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const createCategory = async (req, res) => {
  try {
    const newCategory = new Category(req.body)
    await newCategory.save()
    return res.send(newCategory)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({slug: req.params.id}).lean()
    if ( !category ) {
      return null
    }
    return res.send(category)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getCategoryByCategory = async (req, res) => {
  try {
    const category = await Category.findOne({category: req.params.id}).lean()
    if ( !category ) {
      return null
    }
    return res.send(category)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const deleteCategory = async (req, res) => {
  try {
    const categoryRemove = await Category.findByIdAndDelete(req.params.id)
    if (!categoryRemove) return res.sendStatus(404)
    return res.sendStatus(204)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const updateCategory = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, req.body, {new: true})
    return res.send(updatedCategory)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}