import express from 'express'
const router = express.Router()

import { fileExists, getClosestQ } from '../../helper'
import { duration as videoDuration, height as videoHeight, extractFrame } from '../../ffmpeg'
import { getSetting } from '../../settings'

import handler from '../../middleware/handler'
import { logger } from '../../middleware/logger'

router.post(
	'/meta',
	handler(async (db) => {
		const videos = await db.query('SELECT path FROM videos WHERE duration = 0 OR height = 0')

		logger('Updating METADATA')
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i]
			const videoPath = `videos/${video.path}`
			const absoluteVideoPath = `./public/${videoPath}`

			if (await fileExists(videoPath)) {
				const height = await videoHeight(absoluteVideoPath)
				const duration = await videoDuration(absoluteVideoPath)

				logger(`Refreshing ${video.path}`)

				await db.query('UPDATE videos SET height = :height, duration = :duration WHERE path = :path', {
					path: video.path,
					height: getClosestQ(height),
					duration
				})
			}
		}
		logger('Finished updating METADATA')
	})
)

router.post(
	'/thumb',
	handler(async (db) => {
		const width = await getSetting('thumbnail_res')

		const videos = await db.query('SELECT id, path FROM videos')
		db.end()

		logger('Generating THUMBNAILS')
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i]
			const videoPath = `videos/${video.path}`
			const imagePath = `images/videos/${video.id}.jpg`
			const imagePath_low = `images/videos/${video.id}-${width}.jpg`

			const absoluteVideoPath = `./public/${videoPath}`
			const absoluteImagePath = `./public/${imagePath}`
			const absoluteImagePath_low = `./public/${imagePath_low}`

			if (await fileExists(videoPath)) {
				// Check if thumbnail exists
				if (!(await fileExists(imagePath))) {
					logger(`Generating HIGHRES: ${video.id}`)
					await extractFrame(absoluteVideoPath, absoluteImagePath)
				}
				if (!(await fileExists(imagePath_low))) {
					logger(`Generating LOWRES: ${video.id}`)
					await extractFrame(absoluteVideoPath, absoluteImagePath_low, 31, width)
				}
			}
		}
		logger('Finished generating THUMBNAILS')
	})
)

router.post(
	'/vtt',
	handler(async (db) => {
		const videos = await db.query('SELECT id, path FROM videos')
		db.end()

		logger('Generating VTT')
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i]
			const videoPath = `videos/${video.path}`
			//const imagePath = `images/videos/${video.id}.jpg`
			const vttPath = `vtt/${video.id}.vtt`

			//const absoluteVideoPath = `./public/${videoPath}`
			//const absoluteImagePath = `./public/${imagePath}`
			//const absoluteVttPath = `./public/${vttPath}`

			if (await fileExists(videoPath)) {
				if (!(await fileExists(vttPath))) {
					// extract images
					// generate tileset from images
					// remove images
					// generate vtt from tileset
				}
			}
		}
		logger('Finished generating VTT')
	})
)

export default router
