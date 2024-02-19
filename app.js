const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Database Error ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertStateDbObjectToResponseObject = dbObject => {
  return {
    stateName: dbObject.state_name,
    stateId: dbObject.state_id,
    population: dbObject.population,
  }
}

const convertDistrictDbObjectToResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const stateNames = `
    SELECT 
      * 
    FROM 
       state;`
  const allStatesArray = await db.all(stateNames)
  response.send(
    allStatesArray.map(eachState =>
      convertStateDbObjectToResponseObject(eachState),
    ),
  )
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const stateQuery = `
    SELECT 
      * 
    FROM 
      state 
    WHERE state_id = ${stateId}`

  const state = await db.get(stateQuery)
  response.send(convertStateDbObjectToResponseObject(state))
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictsQuery = `
    SELECT
      *
    FROM 
      district 
    WHERE 
       district_id = ${districtId}`
  const district = await db.get(getDistrictsQuery)
  response.send(convertDistrictDbObjectToResponseObject(district))
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const postDistrictQuery = `
           INSERT INTO 
               district (district_name,
                          state_id,
                          cases,
                          cured, 
                          active,
                          deaths)
            VALUES(
                '${districtName}',
                 ${stateId},
                 ${cases},
                 ${cured},
                 ${active},
                 ${deaths});`
  await db.run(postDistrictQuery)

  response.send('District Successfully Added')
})

app.delete('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const removeDistrict = `
    DELETE 
    FROM 
      district 
    WHERE district_id = ${districtId}`
  await db.run(removeDistrict)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const updateDistrictQuery = `
  UPDATE
    district 
  SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};
                         `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const stateQuery = `
          SELECT 
              SUM(cases),
              SUM(cured),
              SUM(active),
              SUM(deaths)
          FROM district 
          WHERE 
              state_id = ${stateId}`
  const stats = await db.get(stateQuery)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const stateQuery = `
          SELECT 
            state_name 
          FROM 
            district 
          NATURAL JOIN 
            state 
        WHERE 
        district_id = ${districtId};`
  const state = await db.get(stateQuery)
  response.send({stateName: state.state_name})
})

module.exports = app
