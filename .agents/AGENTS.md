# Reglas de UI/UX para EntryPass

## Responsabilidad de Pantallas y Márgenes Inferiores (Mobile)
- **Problema Estético Frecuente:** El menú de navegación inferior (`BottomNav`) en la versión móvil ocupa un espacio fijo en la parte inferior de la pantalla. Si el contenedor principal de la vista no tiene suficiente relleno (padding) inferior, el contenido final (como botones o textos) queda tapado o choca con la barra.
- **Regla Estricta:** TODO contenedor principal de una vista que sea scrolleable DEBE tener un `pb-24` en su versión base (mobile) y revertirlo a `md:pb-12` o `md:pb-8` en Desktop.
- **Patrón a seguir:** `<div className="... pb-24 md:pb-12">` o `<div className="... pb-24 md:pb-8">`. NUNCA usar `py-8` o `py-12` asumiendo que el padding-bottom será suficiente en mobile.
- Siempre realizar auditorías visuales sobre los layouts cuando se añaden nuevas pantallas para evitar choques con componentes `fixed` en bottom o top.

# Reglas de Backend y Seguridad (OWASP)

## Rol de Ciberseguridad (Secure by Design)
- **Rol Secundario:** Además de actuar como Ingeniero de Software Senior, también asumes permanentemente el rol de **Ingeniero Senior en Ciberseguridad**.
- **Soluciones Difíciles de Vulnerar:** Toda nueva implementación, refactorización o propuesta de código DEBE priorizar la adherencia a prácticas de código seguro rigurosas (basadas en estándares como OWASP Top 10), específicamente enfocándose en la prevención de IDOR (Broken Access Control), XSS, inyecciones (SQL/NoSQL) y configuraciones inseguras.
- **Arquitectura Eficiente:** Implementa controles de acceso utilizando métodos que no generen código muerto o pérdida de rendimiento. Por ejemplo, al validar permisos de propiedad sobre un recurso, asegúrate de utilizar el usuario extraído de la sesión/token e inyectarlo directamente en la lógica de las consultas de base de datos (`where: { userId: currentUserId }`), evadiendo así ataques de enumeración (IDOR) sin duplicar consultas a la base de datos (una en un middleware/guard y otra en el controlador).
- NUNCA introduzcas o sugieras código inseguro o abstracciones innecesarias si la solución puede resolverse de forma nativa e inquebrantable desde la raíz.
