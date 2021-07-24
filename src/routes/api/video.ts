import express from 'express'
const router = express.Router()
import Joi from 'joi'

import { sql } from '../../db'
import { formatDate } from '../../helper'

import handler from '../../middleware/handler'
import schemaHandler from '../../middleware/schema'

router.get(
	'/',
	handler(async (db) => await db.query(sql(500), { id: 0 }))
)

router.put(
	'/:id',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				cen: Joi.boolean(),
				noStar: Joi.boolean(),
				plays: Joi.number().integer().min(0),
				title: Joi.string(),
				brand: Joi.string(),
				franchise: Joi.string(),
				date: Joi.string().allow('')
			}).xor('cen', 'noStar', 'plays', 'title', 'franchise', 'brand', 'date'),
			body
		)

		if ('cen' in value) {
			await db.query('UPDATE videos SET cen = :cen WHERE id = :videoID', { cen: value.cen, videoID: id })
			let video = await db.query('SELECT * FROM videos WHERE id = :videoID LIMIT 1', { videoID: id })
			video = video[0]

			video.censored = video.cen
			delete video.cen

			return video
		} else if ('noStar' in value) {
			await db.query('UPDATE videos SET noStar = :noStar WHERE id = :videoID', {
				noStar: value.noStar,
				videoID: id
			})

			const video = await db.query('SELECT * FROM videos WHERE id = :videoID LIMIT 1', { videoID: id })

			return video[0]
		} else if ('plays' in value) {
			if (!value.plays) {
				// Reset PLAYS
				await db.query('DELETE FROM plays WHERE videoID = :videoID', { videoID: id })
			} else {
				// Add PLAYS
				await db.query('INSERT INTO plays(videoID) VALUES(:videoID)', { videoID: id })
			}
		} else if ('title' in value) {
			await db.query('UPDATE videos SET name = :title WHERE id = :videoID', {
				title: value.title,
				videoID: id
			})
		} else if ('franchise' in value) {
			await db.query('UPDATE videos SET franchise = :franchise WHERE id = :videoID', {
				franchise: value.franchise,
				videoID: id
			})
		} else if ('brand' in value) {
			await db.query('UPDATE videos SET brand = :brand WHERE id = :videoID', {
				brand: value.brand,
				videoID: id
			})
		} else if ('date' in value) {
			if (!value.date) {
				// RESET VALUE
				await db.query('UPDATE videos SET date_published = NULL WHERE id = ?', { videoID: id })
			} else {
				let date = formatDate(value.date, true)
				await db.query('UPDATE videos SET date_published = :date WHERE id = :videoID', { date, videoID: id })
			}

			const result = await db.query('SELECT * FROM videos WHERE id = :videoID LIMIT 1', { videoID: id })

			const video = result[0]
			video.date_published = formatDate(video.date_published)

			return video
		}
	})
)

router.get(
	'/:id',
	handler(async (db, { id }) => {
		let data = await db.query('SELECT * FROM videos WHERE id = :id LIMIT 1', { id })
		const video = data[0]

		// Rename 'height' >> 'quality'
		video.quality = video.height
		delete video.height

		// Rename 'cen' >> 'censored'
		video.censored = !!video.cen
		delete video.cen

		// Format Date
		let date_added = video.date
		let date_published = video.date_published || ''

		// Check if date is NULL
		date_added = formatDate(date_added)

		// Check if date is NULL
		if (date_published) {
			date_published = formatDate(date_published)
		}

		// change 'date(s)' to object
		video.date = {
			added: date_added,
			published: date_published
		}
		delete video.date_published

		// change 'path(s)' to object
		video.path = {
			file: video.path,
			stream: `${video.path.split('.').slice(0, -1).join('.')}/playlist.m3u8`
		}

		// Get NextID
		const nextIDs: any[] = await db.query(sql(), { id })

		let match = false
		nextIDs.forEach((item) => {
			if (!match) {
				if (item.id == id) match = true
			} else if (!video.nextID) {
				video.nextID = item.id
			}
		})

		// Get SameFranchise (related)
		const related = await db.query('SELECT id, name FROM videos WHERE franchise = :franchise ORDER BY episode', {
			franchise: video.franchise
		})

		video.related = []
		for (let i = 0; i < related.length; i++) {
			const item = related[i]

			const data = await db.query('SELECT COUNT(*) as total FROM plays WHERE videoID = :videoID', {
				videoID: item.id
			})
			const plays = data[0].total

			video.related.push({
				id: item.id,
				name: item.name,
				plays
			})
		}

		return video
	})
)

router.get(
	'/:id/bookmark',
	handler(async (db, { id }) => {
		const bookmarks = await db.query(
			'SELECT bookmarks.id, categories.name, bookmarks.start FROM bookmarks JOIN categories ON bookmarks.categoryID = categories.id WHERE videoID = :videoID ORDER BY start',
			{ videoID: id }
		)

		for (let i = 0; i < bookmarks.length; i++) {
			const bookmark = bookmarks[i]

			var star = await db.query(
				'SELECT stars.id, stars.image FROM bookmarkstars JOIN stars ON bookmarkstars.starID = stars.id WHERE bookmarkID = :bookmarkID LIMIT 1',
				{ bookmarkID: bookmark.id }
			)
			star = star[0]

			// Find bookmarkattributes
			bookmark.attributes = []
			if (star) {
				// Bookmark has star, find starattributes

				bookmark.starID = star.id
				bookmark.starImage = star.image

				const starAttributes: any[] = await db.query(
					'SELECT attributes.id, attributes.name FROM starattributes JOIN attributes ON starattributes.attributeID = attributes.id WHERE starID = :starID',
					{ starID: star.id }
				)

				starAttributes.forEach((starAttribute) => {
					bookmark.attributes.push({
						id: starAttribute.id,
						name: starAttribute.name
					})
				})
			} else {
				bookmark.starID = 0
				bookmark.starImage = null
			}

			const bookmarkAttributes: any[] = await db.query(
				'SELECT attributes.name, attributes.id FROM bookmarkattributes JOIN attributes ON bookmarkattributes.attributeID = attributes.id WHERE bookmarkID = :bookmarkID',
				{ bookmarkID: bookmark.id }
			)

			bookmarkAttributes.forEach((bookmarkAttribute) => {
				bookmark.attributes.push({
					id: bookmarkAttribute.id,
					name: bookmarkAttribute.name
				})
			})
		}

		return bookmarks
	})
)

router.post(
	'/:id/bookmark',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				categoryID: Joi.number().integer().min(1).required(),
				time: Joi.number().integer().min(1).required(),
				starID: Joi.number().integer().min(1)
			}),
			body
		)

		const { categoryID, time } = value

		if ('starID' in value) {
			const starID = value.starID

			const star = await db.query('SELECT image FROM stars WHERE id = :starID', { starID })
			const starImage = star[0].image

			// Add Bookmark + Star
			const bookmark = await db.query(
				'SELECT COUNT(*) as total FROM bookmarks WHERE videoID = :videoID AND start = :time LIMIT 1',
				{ videoID: id, time }
			)
			if (!bookmark[0].total) {
				const result: any[] = await db.query(
					'SELECT attributes.id, attributes.name FROM starattributes JOIN attributes ON starattributes.attributeID = attributes.id WHERE starID = :starID',
					{ starID }
				)

				const attributes: any[] = []
				result.forEach((attribute) => {
					attributes.push(attribute)
				})

				const insert = await db.query(
					'INSERT INTO bookmarks(videoID, categoryID, start) VALUES(:videoID, :categoryID, :time)',
					{
						videoID: id,
						categoryID,
						time
					}
				)
				const bookmarkID = insert.insertId

				let bookmarkStar = await db.query(
					'SELECT COUNT(*) as total FROM bookmarkstars WHERE bookmarkID = :bookmarkID',
					{
						bookmarkID
					}
				)
				if (!bookmarkStar[0].total) {
					// bookmark does not have a star-relation
					await db.query('INSERT INTO bookmarkstars(bookmarkID, starID) VALUES(:bookmarkID, :starID)', {
						bookmarkID,
						starID
					})
					// Relation was Created
				} else {
					// bookmark does have a star-relation
					const bookmarkStar = await db.query(
						'SELECT COUNT(*) as total FROM bookmarkstars WHERE bookmarkID = :bookmarkID LIMIT 1',
						{ bookmarkID: bookmarkID }
					)
					if (!bookmarkStar[0].total) {
						await db.query('UPDATE bookmarkstars SET starID = :starID WHERE bookmarkID = :bookmarkID', {
							starID,
							bookmarkID
						})
					}
				}

				return { id: bookmarkID, videoID: id, categoryID, time, starID, starImage, attributes }
			}
		} else {
			// Add Bookmark

			const bookmark = await db.query(
				'SELECT COUNT(*) as total FROM bookmarks WHERE videoID = :videoID AND start = :time LIMIT 1',
				{ videoID: id, time }
			)
			if (!bookmark[0].total) {
				const insert = await db.query(
					'INSERT INTO bookmarks(videoID, categoryID, start) VALUES(:videoID, :categoryID, :time)',
					{
						videoID: id,
						categoryID,
						time
					}
				)

				return { id: insert.insertId, videoID: id, categoryID, time, starID: 0 }
			}
		}
	})
)

router.get(
	'/:id/star',
	handler(async (db, { id }) => {
		const stars = await db.query(
			'SELECT stars.id, stars.name, stars.image FROM stars JOIN videostars ON stars.id = videostars.starID WHERE videostars.videoID = :videoID ORDER BY stars.id',
			{ videoID: id }
		)

		for (let i = 0; i < stars.length; i++) {
			const star = stars[i]

			star.attributes = await db.query(
				'SELECT attributes.id, attributes.name FROM attributes JOIN starattributes ON attributes.id = starattributes.attributeID WHERE starattributes.starID = :starID',
				{ starID: star.id }
			)
		}

		return stars
	})
)

router.post(
	'/:id/star',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				name: Joi.string().min(2).required()
			}),
			body
		)

		var star = await db.query('SELECT id, image FROM stars WHERE name = :name LIMIT 1', { name: value.name })

		if (!star[0]) {
			// INSERT INTO TABLE
			await db.query('INSERT INTO stars(name) VALUES(:name)', { name: value.name })

			var star = await db.query('SELECT id, image FROM stars WHERE name = :name LIMIT 1', {
				name: value.name
			})
		}

		star = star[0]

		const starID = star.id

		const result = await db.query(
			'SELECT COUNT(*) as total FROM videostars WHERE starID = :starID AND videoID = :videoID LIMIT 1',
			{
				starID,
				videoID: id
			}
		)
		if (!result[0].total) {
			await db.query('INSERT INTO videostars(starID, videoID) VALUES(:starID, :videoID)', {
				starID,
				videoID: id
			})

			const result: any[] = await db.query(
				'SELECT attributes.id, attributes.name FROM attributes JOIN starattributes ON attributes.id = starattributes.attributeID WHERE starattributes.starID = :starID',
				{ starID }
			)

			star.attributes = []
			result.forEach((attribute) => {
				star.attributes.push(attribute)
			})

			return star
		} else {
			throw new Error('Star has already been added')
		}
	})
)

router.delete(
	'/:id/star/:starID',
	handler(async (db, { id, starID }) => {
		await db.query('DELETE FROM videostars WHERE videoID = :id AND starID = :starID', { id, starID })
	})
)

export default router
