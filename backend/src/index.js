require('dotenv').config()
const express = require('express')
const cors = require('cors')

const { conectar } = require('./db')
const { manejarErrores } = require('./middleware/errores')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth',           require('./routes/auth'))
app.use('/api/clientes',       require('./routes/clientes'))
app.use('/api/zonas',          require('./routes/zonas'))
app.use('/api/transportistas', require('./routes/transportistas'))
app.use('/api/proveedores',    require('./routes/proveedores'))
app.use('/api/insumos',        require('./routes/insumos'))
app.use('/api/productos',      require('./routes/productos'))
app.use('/api/pedidos',        require('./routes/pedidos'))
app.use('/api/envios',         require('./routes/envios'))
app.use('/api/produccion',     require('./routes/produccion'))
app.use('/api/reportes',       require('./routes/reportes'))
app.use('/api/precios',        require('./routes/precios'))
app.use('/api/rutas',          require('./routes/rutas'))

app.get('/api/ping', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando' })
})

app.use(manejarErrores)

async function iniciarServidor() {
  await conectar()
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
  })
}

iniciarServidor()
