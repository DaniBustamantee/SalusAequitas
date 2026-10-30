function Bloque({ w = "100%", h = "14px", r = "var(--radius-md)", style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      backgroundColor: "var(--border)",
      animation: "skeletonPulse 1.4s ease-in-out infinite",
      flexShrink: 0,
      ...style,
    }} />
  )
}

export function SkeletonTabla({ filas = 5, columnas = 4 }) {
  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-md)",
      border: "1px solid var(--border)",
      overflow: "hidden",
    }}>

      <div style={{
        backgroundColor: "var(--bg-surface-2)",
        padding: "0.8rem 1.1rem",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        gap: "1rem",
      }}>
        {Array.from({ length: columnas }).map((_, i) => (
          <Bloque key={i} w={i === 0 ? "18%" : "12%"} h="10px" />
        ))}
      </div>

      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} style={{
          padding: "0.9rem 1.1rem",
          borderBottom: i < filas - 1 ? "1px solid var(--border)" : "none",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}>
          <Bloque w="18%" h="12px" style={{ animationDelay: `${i * 0.08}s` }} />
          {Array.from({ length: columnas - 1 }).map((_, j) => (
            <Bloque key={j} w="12%" h="12px" style={{ animationDelay: `${(i + j) * 0.06}s` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ cantidad = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--border)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}>
          <Bloque w="40%" h="10px" style={{ animationDelay: `${i * 0.1}s` }} />
          <Bloque w="60%" h="22px" style={{ animationDelay: `${i * 0.1 + 0.05}s` }} />
          <Bloque w="80%" h="10px" style={{ animationDelay: `${i * 0.1 + 0.1}s` }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDetalle() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1rem" }}>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {[5, 4].map((lineas, ci) => (
          <div key={ci} style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--border)",
            padding: "1.25rem",
            display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <Bloque w="30%" h="12px" />
            {Array.from({ length: lineas }).map((_, i) => (
              <Bloque key={i} h="12px" w={`${60 + Math.random() * 30}%`}
                style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {[3, 5].map((lineas, ci) => (
          <div key={ci} style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--border)",
            padding: "1.25rem",
            display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <Bloque w="40%" h="12px" />
            {Array.from({ length: lineas }).map((_, i) => (
              <Bloque key={i} h="12px" w={`${50 + Math.random() * 40}%`}
                style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
