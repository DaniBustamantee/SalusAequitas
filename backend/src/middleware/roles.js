const ROLES = {
  ADMIN: 'Administrador',
  CLIENTE: 'Cliente',
  TRANSPORTISTA: 'Transportista',
  OPERARIO: 'Operario de Produccion',
}

const ALIAS = {
  'Operario de Producción': ROLES.OPERARIO,
}

function normalizarRol(rol) {
  return ALIAS[rol] || rol
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = normalizarRol(req.usuario?.rol)
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: 'No tenés permiso para realizar esta acción' })
    }
    next()
  }
}

function esRol(req, rol) {
  return normalizarRol(req.usuario?.rol) === rol
}

module.exports = { ROLES, permitirRoles, esRol }
