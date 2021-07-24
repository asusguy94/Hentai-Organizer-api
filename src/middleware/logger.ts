import { Request, Response, NextFunction } from 'express'

export const logger = (message: string) => {
	// use rollbar instead
	console.log(message)
}

export default (err: Error, _req: Request, res: Response, _next: NextFunction) => {
	res.status(404).send(err.message)

	logger(err.message)
}
