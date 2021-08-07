# Hentai Backend Scripts

## Requirements

1. Yarn package manger
2. Database (preferable mariaDB)
    - host
    - username
    - password
    - database
3. FFMPEG and FFPROBE (one of the following) ([more info](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#prerequisites))
    1. Installed to the server and added to path
    2. Installed to the server and added to ENV
    3. Installed to the server in the root folder

## About docker-image

Using the `Dockerfile`, you can create a prebuilt version of the app. This version already contains _ffmpeg_ and _NodeJS_, so you only have to install your choice of _database_-system.

## Installation

1. Edit config.json

|   variable    | Details                                  |
| :-----------: | ---------------------------------------- |
|   `db.host`   | The host path for the sql-server         |
| `db.username` | The username for the database            |
| `db.password` | The password for the database            |
| `db.database` | The database name of the chosen database |

2. Import `database.sql` into your database of choice
    > SQL file has not been updated, but if you have an old install, that one might work as well

# Start Scripts

1. Open terminal in this folder
2. Run `yarn --production` to install the packages in build mode
3. Run `yarn build`
4. Run `yarn start`
