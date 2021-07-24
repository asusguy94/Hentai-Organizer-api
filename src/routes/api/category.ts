import express from 'express'
const router = express.Router()
import Joi from 'joi'

import handler from '../../middleware/handler'

router.get(
	'/',
	handler(async (db) => await db.query('SELECT * FROM categories ORDER BY name'))
)

router.put(
	'/:id',
	handler(async (db, { id }, body) => {
		const schema = Joi.object({
			value: Joi.string().required()
		})

		const { error, value } = schema.validate(body)
		if (error) {
			throw new Error(error.details[0].message)
		}

		await db.query('UPDATE categories SET name = :value WHERE id = :categoryID', {
			value: value.value,
			categoryID: id
		})
	})
)

router.post(
	'/',
	handler(async (db, {}, body) => {
		const schema = Joi.object({
			name: Joi.string().min(3).required()
		})

		const { error, value } = schema.validate(body)
		if (error) {
			throw new Error(error.details[0].message)
		}

		if ('name' in value) {
			const category = value.name

			const result = await db.query('SELECT COUNT(*) as total FROM categories WHERE name = :category LIMIT 1', {
				category
			})

			if (!result[0].total) {
				await db.query('INSERT INTO categories(name) VALUES(:category)', { category })
			} else {
				throw new Error('Category already exists')
			}
		}
	})
)

export default router
