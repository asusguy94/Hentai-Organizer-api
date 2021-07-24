import express from 'express'
const router = express.Router()
import Joi from 'joi'

import handler from '../../middleware/handler'

router.get(
	'/',
	handler(async (db) => await db.query('SELECT * FROM attributes ORDER BY name'))
)

router.get(
	'/video',
	handler(async (db) => await db.query('SELECT * FROM attributes WHERE starOnly = FALSE ORDER BY name'))
)

router.get(
	'/star',
	handler(async (db) => await db.query('SELECT * FROM attributes WHERE videoOnly = FALSE ORDER BY name'))
)

router.put(
	'/:id',
	handler(async (db, { id }, body) => {
		const schema = Joi.object({
			value: Joi.alternatives(Joi.string(), Joi.number().integer()).required(),
			label: Joi.string()
		})

		const { error, value } = schema.validate(body)
		if (error) {
			throw new Error(error.details[0].message)
		}

		if ('label' in value) {
			const { label } = value

			await db.query(`UPDATE attributes SET ${label} = :value WHERE id = :attributeID`, {
				value: value.value,
				attributeID: id
			})
		} else {
			await db.query('UPDATE attributes SET name = :value WHERE id = :attributeID', {
				value: value.value,
				attributeID: id
			})
		}
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
			const attribute = value.name

			const result = await db.query('SELECT COUNT(*) as total FROM attributes WHERE name = :attribute LIMIT 1', {
				attribute
			})

			if (!result[0].total) {
				await db.query('INSERT INTO attributes(name) VALUES(:attribute)', { attribute })
			} else {
				throw new Error('Attribute already exists')
			}
		}
	})
)

export default router
