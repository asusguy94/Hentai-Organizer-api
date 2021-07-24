import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import dayjs from 'dayjs'

import { getSetting } from './settings'

import { settings as settingsConfig } from './config'

const getClosest = (search: number, arr: number[]) => {
	return arr.reduce((a, b) => {
		const aDiff = Math.abs(a - search)
		const bDiff = Math.abs(b - search)

		if (aDiff === bDiff) {
			return a > b ? a : b
		} else {
			return bDiff < aDiff ? b : a
		}
	})
}

export const downloader = async (url: string, path: string) => {
	const response = await fetch(url)
	const buffer = await response.buffer()
	await fs.promises.writeFile(`./${path}`, buffer)
}

export const dirOnly = (dir: string) => path.parse(dir).name

export const removeThumbnails = async (videoID: any) => {
	// Remove Images
	fs.unlink(`./public/images/videos/${videoID}.jpg`, () => {})
	fs.unlink(`./public/images/videos/${videoID}-${await getSetting('thumbnail_res')}.jpg`, () => {})

	// Remove Previews
	fs.unlink(`./public/images/thumbnails/${videoID}.jpg`, () => {})
	fs.unlink(`./public/vtt/${videoID}.vtt`, () => {})
}

export const getClosestQ = (quality: number) => {
	if (quality === 396) {
		return 480
	}

	return getClosest(quality, settingsConfig.qualities)
}

export const fileExists = async (path: string) => {
	return new Promise((resolve) => {
		fs.access(`./public/${path}`, fs.constants.F_OK, (err) => {
			if (!err) {
				resolve(true)
				return
			}

			resolve(false)
		})
	})
}

export const formatDate = (dateStr: string, raw = false) => {
	const date = dayjs(dateStr)

	return raw ? date.format('YYYY-MM-DD') : date.format('D MMMM YYYY')
}

export const getResizedThumb = async (id: any) => `${id}-${await getSetting('thumbnail_res')}.jpg`
