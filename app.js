import { google } from 'googleapis'
import fs from 'fs'
import 'dotenv/config'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const content = fs.readFileSync('./turing-mark-356110-abe2a5dacd4b.json')
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(content),
  scopes: SCOPES
})

const sheets = google.sheets({ version: 'v4', auth })

async function clearSheet (sheetName) {
  await sheets.spreadsheets.values.clear({
    // borramos toda la hoja antes de actualizarla
    spreadsheetId: process.env.SPREEDSHEETID,
    range: `${sheetName}!A:Z`
  })
}

async function printData (data) {
  const total = data.total
  const sheetName = 'DATA'
  const rows = []

  if (total === 0) {
    try {
      await clearSheet(sheetName)
    } catch (error) {
      console.log(error)
    }
  } else {
    data.issues.forEach(issue => {
      if (issue.fields.customfield_10305 !== null) {
        const diasLectivosField = issue.fields.customfield_10287
        const diasLectivosString = Array.isArray(diasLectivosField)
          ? diasLectivosField.map(dia => dia.value).toString()
          : ' '

        const horaInicio = issue.fields.customfield_10332 ? issue.fields.customfield_10332.value : ' '
        const horaFin = issue.fields.customfield_10339 ? issue.fields.customfield_10339.value : ' '

        const row = [
          issue.key,
          issue.fields.summary,
          issue.fields.customfield_10305,
          issue.fields.customfield_10312,
          issue.fields.customfield_10306,
          `https://puenteam.atlassian.net/browse/${issue.key}`,
          diasLectivosString,
          horaInicio,
          horaFin
        ]
        rows.push(row)
      }
    })

    const newTotal = rows.length
    const resource = {
      valueInputOption: 'RAW',
      data: [
        {
          range: `${sheetName}!A1:I${newTotal}`,
          values: rows
        }
      ]
    }
    try {
      await clearSheet(sheetName)
      const response = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: process.env.SPREEDSHEETID,
        resource
      })
      if (response.data && response.data.totalUpdatedCells) {
        console.log(
          `Celdas actualizadas: ${response.data.totalUpdatedCells} celda(s) actualizada(s).`
        )
      } else {
        console.log('No se actualizó ninguna celda.')
      }
    } catch (error) {
      console.error('Error updating cells:', error)
    }
  }
}

async function getDataFromJira (query) {
  const url = 'https://pueteam.atlassian.net/rest/api/2/' + query
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.JIRA_USER + ':' + process.env.JIRA_API_KEY).toString('base64')}`,
      Accept: 'application/json'
    }
  }
  try {
    const response = await fetch(url, options)
    if (!response.ok && response.status === 400) {
      throw new Error('Network response was not ok')
    } else {
      const data = await response.json()
      printData(data)
    }
  } catch (error) {
    console.error('Fetch Error:', error)
  }
}
/**
const cursos_en_marcha = 'search?jql=project = "Gestión de cursos" AND "Start date[Date]" <= startOfDay() AND duedate >= startOfDay()  AND status != FINALIZADO and type = Epic'
const cursos_no_iniciados = 'search?jql=project = "Gestión de cursos" AND "Start date[Date]" > startOfDay() and status = "EN PROGRESO" and type = Epic'
const cursos_por_confirmar = 'search?jql=project = "Gestión de cursos" AND status = "POR CONFIRMAR" AND type =Epic'
const instalaciones = 'search?jql=project = "Gestión de cursos" AND "Start date[Date]" <= startOfDay()  AND duedate >= startOfDay()  AND status != FINALIZADO and type = "Instalación curso"'

*/

const desaprovisionamiento = 'search?jql=project = "Gestión de cursos" AND status != FINALIZADO and type = "Desaprovisionamiento curso" ORDER BY cf[10305]&startAt=0&maxResults=100'
// const query = 'search?jql=project = "Gestión de cursos" and issue = "TR-4040" and "Servidor[Short text]" ~ "\\"s1\\""'

getDataFromJira(desaprovisionamiento)
