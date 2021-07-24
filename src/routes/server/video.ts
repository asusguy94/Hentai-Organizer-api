import express from 'express'
const router = express.Router()
import Joi from 'joi'

import fs from 'fs'
import rimraf from 'rimraf'

import { dirOnly, removeThumbnails } from '../../helper'
import { generateFranchise, generateEpisode, generateName } from '../../generate'

import handler from '../../middleware/handler'

router.put(
	'/:id',
	handler(async (db, { id }, body) => {
		const schema = Joi.object({
			path: Joi.string()
		})

		const { error, value } = schema.validate(body)
		if (error) {
			throw new Error(error.details[0].message)
		}

		if ('path' in value) {
			const newPath = value.path

			const result = await db.query('SELECT COUNT(*) as total FROM videos WHERE path = :path LIMIT 1', {
				path: newPath
			})
			if (!result[0].total) {
				const video = await db.query('SELECT path FROM videos WHERE id = :id LIMIT 1', { id })
				if (video[0].path) {
					// RENAME FILE
					const oldPath = video[0].path

					// ASYNC fs.rename >> fs.promises.rename
					fs.rename(`./public/videos/${oldPath}`, `./public/videos/${newPath}`, () => {})
					// ASYNC fs.rename >> fs.promises.rename
					fs.rename(`./public/videos/${dirOnly(oldPath)}`, `./public/videos/${dirOnly(newPath)}`, () => {})

					// UPDATE DATABASE
					await db.query('UPDATE videos SET path = :newPath WHERE id = :id', { newPath, id })
				} else {
					throw new Error('Invalid videoID')
				}
			} else {
				throw new Error('File already exists')
			}
		} else {
			// Refresh Video
			const videos = await db.query('SELECT path FROM videos WHERE id = :videoID LIMIT 1', { videoID: id })

			// Update Database
			await db.query('UPDATE videos SET duration = 0, height = 0 WHERE id = :id', { id })

			// Remove Files
			await removeThumbnails(id)

			// Remove HLS/DASH-dirs
			// DEBUG only used for updating quality >> will require some time to refresh
			rimraf(`./public/videos/${dirOnly(videos[0].path)}`, () => {})
		}
	})
)

router.delete(
	'/:id',
	handler(async (db, { id }) => {
		const video = await db.query('SELECT path FROM videos WHERE id = :id LIMIT 1', { id })
		if (video[0].path) {
			const videoPath = video[0].path

			const result = await db.query('SELECT COUNT(*) as total FROM videostars WHERE videoID = :id LIMIT 1', {
				id
			})
			if (!result[0].total) {
				await db.query('DELETE FROM videos WHERE id = :id', { id })
				await db.query('DELETE FROM plays WHERE videoID = :id', { id })

				removeThumbnails(id)

				// ASYNC fs.unlink >> fs.promises.unlink
				fs.unlink(`./public/videos/${videoPath}`, () => {})
				rimraf(`./public/videos/${dirOnly(videoPath)}`, () => {})
			} else {
				throw new Error('Please remove any stars from the video first')
			}
		} else {
			throw new Error('Invalid videoID')
		}
	})
)

router.post(
	'/',
	handler(async (db) => {
		const filesDB: any[] = await db.query('SELECT * FROM videos')
		const filesArray = filesDB.map((video) => video.path)

		// TODO Uses promise
		const files = await fs.promises.readdir('./public/videos')

		const maxFiles = 10
		let fileCount = 0
		const newFiles = []
		for (let i = 0; i < files.length; i++) {
			const file = files[i]

			if (fileCount < maxFiles) {
				if (!filesArray.includes(file) && (await fs.promises.lstat(`./public/videos/${file}`)).isFile()) {
					newFiles.push({
						path: file,
						franchise: generateFranchise(file),
						episode: generateEpisode(file),
						name: generateName(file)
					})

					fileCount++
				}
			}
		}

		return newFiles
	})
)

router.post(
	'/add',
	handler(async (db, {}, body) => {
		const schema = Joi.object({
			videos: Joi.array()
		})

		const { error, value } = schema.validate(body)
		if (error) {
			throw new Error(error.details[0].message)
		}

		const { videos } = value

		for (let i = 0; i < videos.length; i++) {
			const video = videos[i]

			await db.query(
				'INSERT INTO videos(name, path, episode, franchise, date) VALUES(:name, :path, :episode, :franchise, NOW())',
				{
					name: video.name,
					path: video.path,
					episode: video.episode,
					franchise: video.franchise,
					//@ts-ignore
					path: video.path
				}
			)
		}
	})
)

export default router
