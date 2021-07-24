import express from 'express'
const router = express.Router()
import Joi from 'joi'

import handler from '../../middleware/handler'
import schemaHandler from '../../middleware/schema'

router.put(
	'/:id',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				time: Joi.number().integer().min(1),
				categoryID: Joi.number().integer().min(1)
			}).xor('time', 'categoryID'),
			body
		)

		if ('time' in value) {
			const time = body.time

			// Change BookmarkTime
			let result = await db.query('SELECT videoID FROM bookmarks WHERE id = :bookmarkID LIMIT 1', {
				bookmarkID: id
			})
			const videoID = result[0].videoID

			result = await db.query(
				'SELECT COUNT(*) as total FROM bookmarks WHERE start = :time AND videoID = :videoID LIMIT 1',
				{
					time,
					videoID
				}
			)
			if (!result[0].total) {
				await db.query('UPDATE bookmarks SET start = :time WHERE id = :bookmarkID', { time, bookmarkID: id })

				// Return NEW bookmark
				const bookmark = await db.query('SELECT * FROM bookmarks WHERE id = :bookmarkID', { bookmarkID: id })
				return bookmark[0]
			}
		} else if ('categoryID' in value) {
			const categoryID = body.categoryID

			// Change CategoryID
			await db.query('UPDATE bookmarks SET categoryID = :categoryID WHERE id = :bookmarkID', {
				categoryID,
				bookmarkID: id
			})
		}
	})
)

router.post(
	'/attribute',
	handler(async (db, {}, body) => {
		const insertHandler = async (bookmarkID: any, attributeID: any) => {
			const result = await db.query(
				'SELECT COUNT(*) as total FROM bookmarkattributes WHERE bookmarkID = :bookmarkID AND attributeID = :attributeID LIMIT 1',
				{ bookmarkID, attributeID }
			)
			if (!result[0].total) {
				await db.query(
					'INSERT INTO bookmarkattributes(bookmarkID, attributeID) VALUES(:bookmarkID, :attributeID)',
					{
						bookmarkID,
						attributeID
					}
				)
			}
		}

		const value = schemaHandler(
			Joi.object({
				bookmarkID: Joi.number().integer().min(1),
				attributeID: Joi.number().integer().min(1).required(),
				starID: Joi.number().integer().min(1),
				videoID: Joi.number().integer().min(1)
			})
				.with('starID', 'videoID')
				.xor('starID', 'bookmarkID'),
			body
		)

		if ('starID' in value && 'videoID' in value) {
			const result = await db.query(
				'SELECT bookmarks.id FROM bookmarks JOIN bookmarkstars ON bookmarks.id = bookmarkstars.bookmarkID WHERE videoID = :videoID AND bookmarkstars.starID = :starID',
				{ videoID: value.videoID, starID: value.starID }
			)

			for (let i = 0; i < result.length; i++) {
				await insertHandler(result[i].id, value.attributeID)
			}
		} else {
			await insertHandler(value.bookmarkID, value.attributeID)
		}
	})
)

router.post(
	'/:id/star',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				starID: Joi.number().integer().min(1).required()
			}),
			body
		)

		if ('starID' in value) {
			const result = await db.query(
				'SELECT COUNT(*) as total FROM bookmarkstars WHERE bookmarkID = :bookmarkID LIMIT 1',
				{
					bookmarkID: id
				}
			)
			if (!result[0].total) {
				// No star relation, set star relation

				await db.query('INSERT INTO bookmarkstars(starID, bookmarkID) VALUES(:starID, :bookmarkID)', {
					starID: value.starID,
					bookmarkID: id
				})
			} else {
				// Has star relation, update star relation

				await db.query('UPDATE bookmarkstars SET starID = :starID WHERE bookmarkID = :bookmarkID', {
					starID: value.starID,
					bookmarkID: id
				})
			}

			const bookmarkStar = await db.query('SELECT * FROM bookmarkstars WHERE bookmarkID = :bookmarkID', {
				bookmarkID: id
			})
			return bookmarkStar[0]
		}
	})
)

router.delete(
	'/:id/star',
	handler(async (db, { id }) => {
		await db.query('DELETE FROM bookmarkstars WHERE bookmarkID = :bookmarkID', { bookmarkID: id })
	})
)

router.delete(
	'/:id',
	handler(async (db, { id }) => {
		await db.query('DELETE FROM bookmarks WHERE id = :bookmarkID', { bookmarkID: id })
		await db.query('DELETE FROM bookmarkstars WHERE bookmarkID = :bookmarkID', { bookmarkID: id })
		await db.query('DELETE FROM bookmarkattributes WHERE bookmarkID = :bookmarkID', { bookmarkID: id })
	})
)

router.delete(
	'/:id/attribute',
	handler(async (db, { id }) => {
		await db.query('DELETE FROM bookmarkattributes WHERE bookmarkID = :bookmarkID', { bookmarkID: id })
	})
)

router.delete(
	'/:id/attribute/:attributeID',
	handler(async (db, { id, attributeID }) => {
		await db.query('DELETE FROM bookmarkattributes WHERE bookmarkID = :bookmarkID AND attributeID = :attributeID', {
			bookmarkID: id,
			attributeID
		})
	})
)

export default router
