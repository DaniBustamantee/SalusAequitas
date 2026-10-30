import { estilosComunes } from "../../styles/estilosComunes"

export default function Campo({ label, error, children }) {
  return (
    <div>
      <label style={estilosComunes.label}>{label}</label>
      {children}
      {error && <p style={estilosComunes.error}>{error}</p>}
    </div>
  )
}
