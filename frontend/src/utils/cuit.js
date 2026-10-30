export function formatearCuit(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 10) return `${digitos.slice(0, 2)}-${digitos.slice(2)}`
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`
}

export function validarCuitDigito(cuit) {
  const digitos = cuit.replace(/\D/g, "")
  if (digitos.length !== 11) return false

  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  for (let i = 0; i < 10; i++) {
    suma += parseInt(digitos[i]) * multiplicadores[i]
  }

  const resto = suma % 11
  if (resto === 1) return false

  const digitoEsperado = resto === 0 ? 0 : 11 - resto
  return digitoEsperado === parseInt(digitos[10])
}
