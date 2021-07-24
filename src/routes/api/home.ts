import express from 'express'
const router = express.Router()

import handler from '../../middleware/handler'

router.get(
	'/:type/:limit',
	handler(async (db, { type, limit }) => {
		let result = null
		switch (type) {
			case 'recent':
				result = await db.query(
					`SELECT videos.id, videos.name, 0 AS total FROM videos WHERE noStar = FALSE ORDER BY id DESC LIMIT ${limit}`
				)
				break

			case 'newest':
				result = await db.query(
					`SELECT videos.id, videos.name, 0 AS total FROM videos WHERE noStar = FALSE ORDER BY date_published DESC LIMIT ${limit}`
				)
				break

			case 'popular':
				result = await db.query(
					`SELECT videos.id, videos.name, COUNT(*) AS total FROM plays JOIN videos ON plays.videoID = videos.id WHERE noStar = FALSE GROUP BY videoID ORDER BY total DESC, date_published DESC LIMIT ${limit}`
				)
				break

			case 'random':
				result = await db.query(
					`SELECT videos.id, videos.name, 0 AS total FROM videos WHERE noStar = FALSE ORDER BY RAND() LIMIT ${limit}`
				)
				break

			default:
				throw new Error(`/${type} is undefined`)
		}

		return result
	})
)

export default router
