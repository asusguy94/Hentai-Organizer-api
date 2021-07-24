import express from 'express'
const router = express.Router()

import handler from '../../middleware/handler'

const initArray = (arr: any[], item: any) => {
	if (item !== null) {
		if (!arr.includes(item)) arr.push(item)
	}

	return arr
}

router.get(
	'/star',
	handler(async (db) => {
		const result = await db.query(
			'SELECT videos.franchise, stars.id AS starID, stars.name AS starName, stars.image, stars.breast, stars.eyecolor, stars.haircolor, stars.hairstyle, attributes.name AS attributeName FROM stars LEFT JOIN starattributes ON starattributes.starID = stars.id LEFT JOIN attributes ON attributes.id = starattributes.attributeID LEFT JOIN videostars ON videostars.starID = stars.id LEFT JOIN videos ON videostars.videoID = videos.id ORDER BY starName'
		)

		const stars = []
		for (let i = 0, len = result.length, attributeArr = [], star: any = {}; i < len; i++) {
			let prev = result[i - 1]
			let current = result[i]
			let next = result[i + 1]

			const { starID, starName } = current

			// Convert NULL to Empty
			const starImage = current.image || ''
			const breast = current.breast || ''
			const eyecolor = current.eyecolor || ''
			const haircolor = current.haircolor || ''
			const hairstyle = current.hairstyle || ''

			// Array-Item
			const { attributeName } = current

			// Duplicate-check functions
			const nextIsDuplicate = i < len - 1 && next.starID === starID
			const prevIsDuplicate = i > 0 && prev.starID === starID

			// INIT array
			attributeArr = initArray(attributeArr, attributeName)

			if (!prevIsDuplicate) {
				// Star Details
				star.id = current.starID
				star.name = starName
				star.image = starImage
				// Star Info
				star.breast = breast
				star.eyecolor = eyecolor
				star.haircolor = haircolor
				star.hairstyle = hairstyle
			}

			if (!nextIsDuplicate) {
				star.attributes = attributeArr

				stars.push(star)

				// Reset Array
				attributeArr = []

				// Reset CurrentObject
				star = {}
			}
		}

		return stars
	})
)

router.get(
	'/video',
	handler(async (db) => {
		const result = await db.query(
			'SELECT videos.path, videos.id AS videoID, videos.name AS videoName, videos.date_published, videos.franchise, videos.noStar, a1.name AS starAttribute, a2.name AS videoAttribute, categories.name AS category, videos.episode, videos.cen, videos.height FROM videos LEFT JOIN videostars ON videostars.videoID = videos.id LEFT JOIN starattributes ON videostars.starID = starattributes.starID LEFT JOIN bookmarks ON videos.id = bookmarks.videoID LEFT JOIN categories ON bookmarks.categoryID = categories.id LEFT JOIN bookmarkattributes ON bookmarkattributes.bookmarkID = bookmarks.id LEFT JOIN attributes a1 ON starattributes.attributeID = a1.id LEFT JOIN attributes a2 ON bookmarkattributes.attributeID = a2.id ORDER BY franchise, episode'
		)

		const videos = []
		for (let i = 0, len = result.length, attributeArr = [], categoryArr = [], video: any = {}; i < len; i++) {
			let prev = result[i - 1]
			let current = result[i]
			let next = result[i + 1]

			const { videoID, videoName, date_published: datePublished, noStar, franchise, cen } = current

			// Array-Item
			const attributeName = []
			attributeName[0] = current.videoAttribute
			attributeName[1] = current.starAttribute
			const { category: categoryName } = current

			// Duplicate-check functions
			const nextIsDuplicate = i < len - 1 && next.videoName === videoName
			const prevIsDuplicate = i > 0 && prev.videoName === videoName

			// INIT array
			attributeArr = initArray(attributeArr, attributeName[0])
			attributeArr = initArray(attributeArr, attributeName[1])
			categoryArr = initArray(categoryArr, categoryName)

			if (!prevIsDuplicate) {
				// Video Details
				video.id = videoID
				video.noStar = noStar
				video.cen = cen
				video.quality = current.height
				video.franchise = franchise
				video.name = videoName

				video.published = datePublished
				if (datePublished) {
					let day = datePublished.getDate()
					if (day < 10) day = `0${day}`
					let month = datePublished.getMonth() + 1
					if (month < 10) month = `0${month}`
					let year = datePublished.getFullYear()
					video.published = `${year}-${month}-${day}`
				}

				const data = await db.query('SELECT COUNT(*) as total FROM plays WHERE videoID = :videoID', { videoID })
				video.plays = data[0].total
			}

			if (!nextIsDuplicate) {
				video.attributes = attributeArr
				video.categories = categoryArr

				videos.push(video)

				// Reset Array
				attributeArr = []
				categoryArr = []

				// Reset CurrentObject
				video = {}
			}
		}

		return videos
	})
)

export default router
