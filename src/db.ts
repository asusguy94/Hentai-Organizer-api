import mariaDB from 'mariadb'

import { db as configDB } from './config'

const connect = (params = true) => {
	return mariaDB.createConnection({
		host: configDB.host,
		user: configDB.user,
		password: configDB.password,
		database: configDB.database,
		namedPlaceholders: params
	})
}

export const sql = (limit = -1) => {
	return `SELECT videos.id, videos.name FROM videos LEFT JOIN bookmarks ON bookmarks.videoID = videos.id WHERE noStar = FALSE OR videos.id = :id GROUP BY name HAVING COUNT(bookmarks.id) < 1 OR videos.id = :id ORDER BY franchise, episode ${
		limit !== -1 ? `LIMIT ${limit}` : ''
	}`
}

export default connect
