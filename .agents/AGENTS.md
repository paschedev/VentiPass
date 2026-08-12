# Reglas de UI/UX para WePass

## Responsabilidad de Pantallas y Márgenes Inferiores (Mobile)
- **Problema Estético Frecuente:** El menú de navegación inferior (`BottomNav`) en la versión móvil ocupa un espacio fijo en la parte inferior de la pantalla. Si el contenedor principal de la vista no tiene suficiente relleno (padding) inferior, el contenido final (como botones o textos) queda tapado o choca con la barra.
- **Regla Estricta:** TODO contenedor principal de una vista que sea scrolleable DEBE tener un `pb-24` en su versión base (mobile) y revertirlo a `md:pb-12` o `md:pb-8` en Desktop.
- **Patrón a seguir:** `<div className="... pb-24 md:pb-12">` o `<div className="... pb-24 md:pb-8">`. NUNCA usar `py-8` o `py-12` asumiendo que el padding-bottom será suficiente en mobile.
- Siempre realizar auditorías visuales sobre los layouts cuando se añaden nuevas pantallas para evitar choques con componentes `fixed` en bottom o top.
