import { dirOnly } from './helper'

const bonusRegex = / (bonus|special|extra)\b/i
const seasonRegex = / (season)\b/i
const episodeRegex = / (episode)\b/i

export const isBonusEpisode = (fname: string) => !!fname.match(bonusRegex)
const isSeasonEpisode = (fname: string) => !!fname.match(seasonRegex)

export const generateFranchise = (path: string) => {
	const fname = dirOnly(path)

	let match = ''
	if (isBonusEpisode(fname)) {
		match = fname.split(bonusRegex)[0]
	} else if (isSeasonEpisode(fname)) {
		match = fname.split(seasonRegex)[0]
	} else {
		match = fname.split(episodeRegex)[0]
	}

	return match.trim()
}

export const generateName = (path: string) => dirOnly(path)

export const generateEpisode = (path: string) => {
	const fname = dirOnly(path)

	let match = ''
	if (isBonusEpisode(fname)) {
		// FIXME might cause error when multiple bonus episodes in same franchise
		match = '99' // Set bonus episode to high number
	} else if (isSeasonEpisode(fname)) {
		const matchArr = fname.split(seasonRegex)
		match = matchArr[matchArr.length - 1]
	} else {
		const matchArr = fname.split(episodeRegex)
		match = matchArr[matchArr.length - 1]
	}

	return match.trim()
}
