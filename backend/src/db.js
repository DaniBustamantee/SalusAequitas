const sql = require('mssql')
require('dotenv').config()

const configuracion = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
}

let pool = null

async function conectar() {
  if (!pool) {
    pool = await sql.connect(configuracion)
    console.log('Conectado a SQL Server')
  }
  return pool
}

module.exports = { conectar, sql }
