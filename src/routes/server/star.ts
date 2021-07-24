import express from 'express'
const router = express.Router()
import Joi from 'joi'

import fs from 'fs'

import { downloader } from '../../helper'

import handler from '../../middleware/handler'

router.post(
	'/:id/image',
	handler(async (db, { id }, body) => {
		const schema = Joi.object({
			url: Joi.string().required()
		})

		const { error, value } = schema.validate(body)
		if (error) {
			throw new Error(error.details[0].message)
		}

		// Update Database
		await db.query('UPDATE stars SET image = :image WHERE id = :id', { image: `${id}.jpg`, id })

		// Download Image
		await downloader(value.url, `public/images/stars/${id}.jpg`)

		return { image: `${id}.jpg` }
	})
)

router.delete(
	'/:id/image',
	handler(async (db, { id }) => {
		const result = await db.query('SELECT image FROM stars WHERE id = :id', { id })
		if (result[0].image) {
			const path = `images/stars/${result[0].image}`

			await db.query('UPDATE stars SET image = NULL WHERE id = :id', { id })

			fs.promises.unlink(`./public/${path}`)
		} else {
			throw new Error('Incorrect ID')
		}
	})
)

export default router
