import fs from 'fs'
import {
  createError,
  useBody,
  useQuery,
  useMethod,
  CompatibilityEvent,
  send,
  sendError,
} from 'h3'
import consola from 'consola'
import jsonwebtoken from 'jsonwebtoken'
import pg from 'pg'
import fetch from 'node-fetch'

const configPostgraphileJwtPublicKeyPath =
  process.env.POSTGRAPHILE_JWT_PUBLIC_KEY_FILE || ''
const secretPostgresDbPath = process.env.POSTGRES_DB_FILE || ''
const secretPostgresRoleMaevsiTusdPasswordPath =
  process.env.POSTGRES_ROLE_MAEVSI_TUSD_PASSWORD_FILE || ''

const configPostgraphileJwtPublicKey = fs.existsSync(
  configPostgraphileJwtPublicKeyPath
)
  ? fs.readFileSync(configPostgraphileJwtPublicKeyPath, 'utf-8')
  : undefined

// eslint-disable-next-line import/no-named-as-default-member
const pool = new pg.Pool({
  database: fs.existsSync(secretPostgresDbPath)
    ? fs.readFileSync(secretPostgresDbPath, 'utf-8')
    : undefined,
  host: 'postgres',
  password: fs.existsSync(secretPostgresRoleMaevsiTusdPasswordPath)
    ? fs.readFileSync(secretPostgresRoleMaevsiTusdPasswordPath, 'utf-8')
    : undefined,
  user: 'maevsi_tusd', // lgtm [js/hardcoded-credentials]
})

export default async function (event: CompatibilityEvent) {
  const method = useMethod(event)

  switch (method) {
    case 'DELETE':
      await tusdDelete(event)
      break
    case 'POST':
      await tusdPost(event)
      break
    default:
      consola.warn(`Unexpected request method: ` + method)
  }
}

async function deleteUpload(
  event: CompatibilityEvent,
  uploadId: any,
  storageKey: any
) {
  let queryResult = await pool
    .query(
      'DELETE FROM maevsi.profile_picture WHERE upload_storage_key = $1;',
      [storageKey]
    )
    .catch((err: Error) => {
      sendError(
        event,
        createError({ statusCode: 500, statusMessage: err.message })
      )
    })

  if (!queryResult) return

  queryResult = await pool
    .query('DELETE FROM maevsi.upload WHERE id = $1;', [uploadId])
    .catch((err) => {
      sendError(
        event,
        createError({ statusCode: 500, statusMessage: err.message })
      )
    })

  if (!queryResult) return

  event.res.statusCode = 204
  await send(event)
}

async function tusdDelete(event: CompatibilityEvent) {
  const { req } = event
  const uploadId = useQuery(event).uploadId

  consola.log('tusdDelete: ' + uploadId)

  if (req.headers.authorization === undefined) {
    return sendError(
      event,
      createError({
        statusCode: 401,
        statusMessage: 'The request header "Authorization" is undefined!',
      })
    )
  }

  if (configPostgraphileJwtPublicKey === undefined) {
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: 'Secret missing!',
      })
    )
  }

  try {
    // eslint-disable-next-line import/no-named-as-default-member
    jsonwebtoken.verify(
      req.headers.authorization.substring(7),
      configPostgraphileJwtPublicKey,
      {
        algorithms: ['RS256'],
        audience: 'postgraphile',
        issuer: 'postgraphile',
      }
    )
  } catch (err: any) {
    return sendError(
      event,
      createError({
        statusCode: 401,
        statusMessage: `Json web token verification failed: "${err.message}"!`,
      })
    )
  }

  const queryRes = await pool
    .query('SELECT * FROM maevsi.upload WHERE id = $1;', [uploadId])
    .catch((err) => {
      sendError(
        event,
        createError({ statusCode: 500, statusMessage: err.message })
      )
    })

  if (!queryRes) return

  if (queryRes.rows.length === 0) {
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: 'No result found for id "' + uploadId + '"!',
      })
    )
  }

  const storageKey = queryRes.rows[0] ? queryRes.rows[0].storage_key : null

  if (storageKey !== null) {
    const httpResp = await fetch('http://tusd:1080/files/' + storageKey + '+', {
      headers: {
        'Tus-Resumable': '1.0.0',
      },
      method: 'DELETE',
    })

    if (httpResp.ok) {
      if (httpResp.status === 204) {
        await deleteUpload(event, uploadId, storageKey)
        event.res.statusCode = 204
        await send(event)
      } else if (httpResp.status === 404) {
        await deleteUpload(event, uploadId, storageKey)
      } else {
        return sendError(
          event,
          createError({
            statusCode: 500,
            statusMessage: 'Tusd status was "' + httpResp.status + '".',
          })
        )
      }
    } else {
      sendError(
        event,
        createError({
          statusCode: 500,
          statusMessage:
            'Internal delete failed: "' + httpResp.statusText + '"!',
        })
      )
    }
  } else {
    await deleteUpload(event, uploadId, storageKey)
  }
}

async function tusdPost(event: CompatibilityEvent) {
  const { req } = event
  const body = await useBody(event)

  switch (req.headers['hook-name']) {
    case 'pre-create': {
      consola.log('tusd/pre-create')

      const queryRes = await pool
        .query('SELECT EXISTS(SELECT * FROM maevsi.upload WHERE uuid = $1);', [
          body.Upload.MetaData.maevsiUploadUuid,
        ])
        .catch((err) => {
          sendError(
            event,
            createError({ statusCode: 500, statusMessage: err.message })
          )
        })

      if (!queryRes) return

      if (!queryRes.rows[0].exists) {
        return sendError(
          event,
          createError({
            statusCode: 500,
            statusMessage: 'Upload id does not exist!',
          })
        )
      }

      await send(event)

      break
    }
    case 'post-finish': {
      consola.log('tusd/post-finish: ' + body.Upload.Storage.Key)

      const queryRes = await pool
        .query('UPDATE maevsi.upload SET storage_key = $1 WHERE uuid = $2;', [
          body.Upload.Storage.Key,
          body.Upload.MetaData.maevsiUploadUuid,
        ])
        .catch((err) => {
          sendError(
            event,
            createError({
              statusCode: 500,
              statusMessage: err.message,
            })
          )
        })

      if (!queryRes) return

      await send(event)

      break
    }
    case 'post-terminate':
      consola.log('tusd/post-terminate: ' + body.Upload.Storage.Key)
      await deleteUpload(
        event,
        body.Upload.MetaData.maevsiUploadUuid,
        body.Upload.Storage.Key
      )

      break
  }
}
