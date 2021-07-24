import express from 'express'
const router = express.Router()
import Joi from 'joi'

import { getResizedThumb } from '../../helper'

import handler from '../../middleware/handler'
import schemaHandler from '../../middleware/schema'

router.get(
	'/:id/video',
	handler(async (db, { id }) => {
		const videos = await db.query(
			'SELECT videos.id, videos.name, videos.path as fname FROM videos JOIN videostars ON videos.id = videostars.videoID WHERE videostars.starID = :starID ORDER BY franchise, episode',
			{ starID: id }
		)

		const result = []
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i]

			video.image = await getResizedThumb(video.id)

			result.push(video)
		}

		return result
	})
)

router.get(
	'/',
	handler(async (db) => {
		// Define Structure
		const data = {
			breast: [],
			eyecolor: [],
			haircolor: [],
			hairstyle: [],
			attribute: []
		}

		// Queries
		const breast = await db.query('SELECT breast FROM stars WHERE breast IS NOT NULL GROUP BY breast')
		const eyecolor = await db.query('SELECT eyecolor FROM stars WHERE eyecolor IS NOT NULL GROUP BY eyecolor')
		const haircolor = await db.query('SELECT haircolor FROM stars WHERE haircolor IS NOT NULL GROUP BY haircolor')
		const hairstyle = await db.query('SELECT hairstyle FROM stars WHERE hairstyle IS NOT NULL GROUP BY hairstyle')
		const attribute = await db.query(
			'SELECT name as attribute FROM attributes WHERE videoOnly = FALSE ORDER BY attribute'
		)

		// Map Data
		data.breast = breast.map(({ breast }: any) => breast)
		data.eyecolor = eyecolor.map(({ eyecolor }: any) => eyecolor)
		data.haircolor = haircolor.map(({ haircolor }: any) => haircolor)
		data.hairstyle = hairstyle.map(({ hairstyle }: any) => hairstyle)
		data.attribute = attribute.map(({ attribute }: any) => attribute)

		return data
	})
)

router.get(
	'/:id',
	handler(async (db, { id }) => {
		const data = await db.query('SELECT * FROM stars WHERE id = :starID LIMIT 1', { starID: id })
		let star = data[0]

		// Change StarInfo to Object
		star.info = {
			breast: star.breast || '',
			eyecolor: star.eyecolor || '',
			haircolor: star.haircolor || '',
			hairstyle: star.hairstyle || ''
		}
		delete star.breast
		delete star.eyecolor
		delete star.haircolor
		delete star.hairstyle

		const starAttributes = await db.query(
			'SELECT name AS item, starID FROM starattributes JOIN attributes ON starattributes.attributeID = attributes.id WHERE starID = :starID GROUP BY item',
			{ starID: id }
		)

		star.info.attribute = []
		starAttributes.forEach(({ item: starAttribute }: any) => {
			star.info.attribute.push(starAttribute)
		})

		return star
	})
)

router.put(
	'/:id',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				name: Joi.string(),
				label: Joi.string(),
				value: Joi.string().allow('')
			})
				.with('label', 'value')
				.xor('name', 'label'),
			body
		)

		if ('name' in value) {
			await db.query('UPDATE stars SET name = :name WHERE id = :starID', { name: value.name, starID: id })

			const star = await db.query('SELECT * FROM stars WHERE id = :starID', { starID: id })

			return star[0]
		} else if ('label' in value) {
			const { label } = value

			if (value.value.length) {
				await db.query(`UPDATE stars SET ${label} = :value WHERE id = :starID`, {
					value: value.value,
					starID: id
				})
			} else {
				await db.query(`UPDATE stars SET ${label} = NULL WHERE id = :starID`, { starID: id })
			}
		}
	})
)

router.put(
	'/:id/attribute',
	handler(async (db, { id }, body) => {
		const value = schemaHandler(
			Joi.object({
				name: Joi.string().required(),
				delete: Joi.boolean()
			}),
			body
		)

		if (value.delete) {
			const attributes = await db.query('SELECT id FROM attributes WHERE name = :name LIMIT 1', {
				name: value.name
			})
			if (attributes[0].id) {
				const attributeID = attributes[0].id

				await db.query('DELETE FROM starattributes WHERE starID = :starID AND attributeID = :attributeID', {
					starID: id,
					attributeID
				})
			} else {
				throw new Error('Attribute does not exist')
			}
		} else {
			// Add attribute to star
			const attributes = await db.query('SELECT id FROM attributes WHERE name = :name LIMIT 1', {
				name: value.name
			})

			// Check if attribute already exists on star
			if (attributes[0].id) {
				const attributeID = attributes[0].id

				const result = await db.query(
					'SELECT COUNT(*) as total FROM starattributes WHERE starID = :starID AND attributeID = :attributeID LIMIT 1',
					{ starID: id, attributeID }
				)
				if (!result[0].total) {
					const hasBookmarkAttribute = await db.query(
						'SELECT COUNT(*) as total FROM bookmarkattributes JOIN bookmarkstars ON bookmarkattributes.bookmarkID = bookmarkstars.bookmarkID WHERE starID = :starID AND attributeID = :attributeID LIMIT 1',
						{ starID: id, attributeID }
					)
					if (!hasBookmarkAttribute[0].total) {
						await db.query(
							'INSERT INTO starattributes(starID, attributeID) VALUES(:starID, :attributeID)',
							{
								starID: id,
								attributeID
							}
						)
					} else {
						throw new Error('One (or more) of the bookmarks already has this attribute')
						//TODO should bookmarkAttributes be removed automatically when attempting to add the same attribute to a star?
					}
				} else {
					throw new Error('Star already has this attribute')
				}
			} else {
				throw new Error('Attribute does not exist')
			}
		}
	})
)

router.delete(
	'/:id',
	handler(async (db, { id }) => {
		const result = await db.query('SELECT COUNT(*) as total FROM videostars WHERE starID = :starID', { starID: id })
		if (!result[0].total) {
			await db.query('DELETE FROM stars WHERE id = :starID', { starID: id })
			await db.query('DELETE FROM starattributes WHERE starID = :starID', { starID: id })
		}
	})
)

router.get(
	'/:id/relation',
	handler(async (db, { id }) => {
		const stars = await db.query('SELECT * FROM stars WHERE id = :starID LIMIT 1', { starID: id })
		if (stars[0]) {
			const star = stars[0]

			const relations = await db.query(
				'SELECT * FROM relations WHERE relationID = :starID OR starID = :starID ORDER BY parentID',
				{
					starID: id
				}
			)

			// could probably just have a lot of columns, since most families are limited
			// could use 1 parent (MOTHER) and 3 children (3 sisters)

			const relationArr = []

			// initial child from currentID
			const children = [{ id: star.id, name: star.name, img: star.image }]

			// Loop through relations
			for (let i = 0; i < relations.length; i++) {
				const relation = relations[i]

				// get info from 'stars'-table
				const relationsData = await db.query('SELECT * FROM stars WHERE id = :relationID LIMIT 1', {
					relationID: relation.relationID !== star.id ? relation.relationID : relation.starID
				})
				if (relationsData[0]) {
					const relationData = relationsData[0]

					children.push({ id: relationData.id, name: relationData.name, img: relationData.image })
				}

				//'star' is related to 'relationData'
			}

			relationArr.push({ id: null, children })

			return relationArr
		}

		// HAS-PARENT
		/*
            [
                {
                    id: 123,
                    name: 'parentName'
                    image: '123.jpg',
                    children: [
                        {
                            id: 456,
                            img: '456.jpg',
                            name: 'childName'
                        }
                    ]
                }
            ]
            */

		// NOT-HAS-PARENT
		/*
            [
                {
                    id: null,
                    children: [
                        {
                            id: 123,
                            img: '123.jpg',
                            name: 'profileName'
                        }
                    ]
                }
            ]
            */

		// SHOULD RETURN
		/*
            [
                {
                    id: null,
                    children: [
                        {
                            id: 1798,
                            img: `${1798}.jpg`,
                            name: 'Yuna Tsubakihara'
                        },
                        {
                            id: 1799,
                            img: `${1799}.jpg`,
                            name: 'Nina Tsubakihara'
                        }
                    ]
                }
            ]
            */
	})
)

export default router
