# Record Store Challenge API
## Description

This is a **NestJS** application starter with MongoDB integration. If necessary, it provides a script to boot a Mongo emulator for Docker. This setup includes end-to-end tests, unit tests, test coverage, linting, and database setup with data from `data.json`.

## Installation

### Install dependencies:

```bash
$ npm install
````

### Docker for MongoDB and Redis
To use the local MongoDB and Redis services, you can start them using Docker:
```
npm run mongo:start
```
This will start MongoDB and Redis on your local machine. You can customize the settings in the Docker setup by modifying the docker-compose-mongo.yml if necessary. In the current configuration, MongoDB is accessible at localhost:27017 and Redis is accessible at localhost:6379.
These URLs are required in the .env file, with example as follows:

```
MONGO_URL=mongodb://localhost:27017/records
REDIS_URL=redis://localhost:6379
PORT=3000
MUSICBRAINZ_BASE_URL=https://musicbrainz.org/ws/2
MB_TIMEOUT_MS=5000
RECORD_LIST_CACHE_TTL_MS=60000
```
This will point your application to the local MongoDB instance and the required Redis cache.

### MongoDB Data Setup
The data.json file contains example records to seed your database. The setup script will import the records from this file into MongoDB.

To set up the database with the example records:

```
npm run setup:db
```
This will prompt the user to cleanup (Y/N) existing collection before importing data.json

The app now uses Mongoose `createdAt` / `updatedAt` timestamps only. If an existing dev database has older `created` / `lastModified` fields, they can be left unused or wiped with the setup prompt. The setup script also removes duplicate logical records by `(artist, album, format)` before syncing the unique index.

To inspect the query plan for the indexed list path:

```
npm run records:explain
```


#### data.json Example
Here’s an example of the data.json file that contains records:
```
[
    {
        "artist": "Foo Fighters",
        "album": "Foo Fighers",
        "price": 8,
        "qty": 10,
        "format": "CD",
        "category": "Rock",
        "mbid": "d6591261-daaa-4bb2-81b6-544e499da727"
  },
  {
        "artist": "The Cure",
        "album": "Disintegration",
        "price": 23,
        "qty": 1,
        "format": "Vinyl",
        "category": "Alternative",
        "mbid": "11af85e2-c272-4c59-a902-47f75141dc97"
  },
]
```

### Running the App
#### Development Mode
To run the application in development mode (with hot reloading):

```
npm run start:dev
```
#### Production Mode
To build and run the app in production mode:

```
npm run start:prod
```

### API Notes

`GET /records` returns a paginated response:

```
{
  "items": [],
  "count": 0,
  "nextCursor": "opaque-cursor"
}
```

Supported filters are `q`, `artist`, `album`, `format`, `category`, `limit`, and `cursor`. `limit` defaults to 20 and is capped at 100. Record writes invalidate the Redis-backed list cache. Updating a missing record now returns `404`.

`POST /orders` accepts `recordId` and `quantity`; stock is decremented atomically so concurrent orders cannot oversell the last copy.

Health checks are exposed at `GET /health` and `GET /readiness`.

### Tests
#### Run Unit Tests
To run unit tests:

```
npm run test
```
To run unit tests with code coverage:

```
npm run test:cov
```
This will show you how much of your code is covered by the unit tests.
#### Run End-to-End Tests
To run end-to-end tests:
```
npm run test:e2e
```
Run Tests with Coverage


Run Linting
To check if your code passes ESLint checks:

```
npm run lint
```
This command will show you any linting issues with your code.

