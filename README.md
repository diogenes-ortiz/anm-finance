# ANM Content Studio · Plataforma interna

Plataforma de la agencia con tres áreas + equipo. No necesita instalación ni compilación: son archivos estáticos (se pueden subir a GitHub Pages igual que antes).

| Archivo | Qué es |
|---|---|
| `index.html` | Plataforma: Inicio, Operaciones, Crecimiento, Equipo, Ajustes |
| `finanzas.html` | Finanzas (la app de siempre) + contraseña, Análisis y Cierre del mes |
| `css/app.css` | Estilos de la plataforma (modo oscuro/claro) |
| `js/store.js` | Datos en Supabase con sincronización colaborativa |
| `js/app.js` | Acceso, roles, invitaciones, navegación, alertas manuales |
| `js/game.js` | Gamificación: XP, niveles, rachas, insignias, misiones semanales |
| `js/ops.js` | Operaciones |
| `js/growth.js` | Crecimiento / CRM |
| `js/home.js` | Inicio, Equipo y Ajustes |
| `js/finanzas-extra.js` | Contraseña, Análisis y Cierre del mes de Finanzas |

## Secciones

**Inicio** — tu foco del día (tareas, reuniones, seguimientos), alertas, misiones de la semana, ranking, insignias y actividad del equipo.

**Operaciones** — filtro por unidad de negocio (Social Media, Pauta, Branding, Web… editables en Ajustes).
- *Seguimiento*: tarjeta por cliente con semáforo (🟢/🟡/🔴), “en qué estamos”, próximo paso, días desde la última actualización. Historial completo en la ficha del cliente.
- *Tareas*: tablero arrastrable o lista agrupada (vencidas, hoy, esta semana…).
- *Calendario*: piezas de contenido, reuniones y tareas en un mes + estado del calendario mensual de cada cliente (por planificar → enviado → aprobado…).
- *Reuniones y minutas*: minuta, decisiones, temáticas (#etiquetas) y acuerdos. “✨ Detectar acuerdos” lee un resumen pegado (Read AI, Meet, etc.) y los convierte en tareas (`@Nombre` asigna, `dd/mm` pone fecha).
- *Alertas*: se calculan solas (clientes sin actualizar, en riesgo, tareas vencidas, reuniones sin minuta, calendarios sin aprobar, contenido por salir sin aprobar). “Avisar” la manda en la app, por WhatsApp o email.

**Crecimiento** — pipeline arrastrable (Queremos contactar → Contactado → Reunión → Propuesta → Negociación → Ganado), base de contactos con importación CSV, ex clientes con fecha de recontacto, evaluador “¿es buena empresa?” (puntaje A-D según criterios de cliente ideal editables + tasa de cierre por fuente y rubro) y métricas. Al ganar un cliente se crea en Operaciones; al dar de baja uno en Operaciones se ofrece guardarlo como ex cliente.

**Finanzas** (solo admins, con contraseña) — todo lo de antes, más:
- *Análisis y comparativas*: período (mes, 3/6/12 meses, año, todo, personalizado) comparado con el período anterior o el mismo del año anterior; KPIs con variación, gráfico, ingresos por servicio, concentración de clientes, tabla mes a mes y conclusiones automáticas.
- *Cierre del mes*: preguntas mensuales (cobros, saldo real, imprevistos, cambios, ánimo…) editables, con racha de meses cerrados.
- La primera vez se crea la contraseña y se muestra un **código de recuperación**: guardalo. Se bloquea sola a los 20 minutos sin uso.

## Equipo e invitaciones
El primero que entra crea su perfil de admin. Desde **Equipo** se invita a cada persona y se le manda su link personal (WhatsApp/email). Roles: *Admin* (todo + Finanzas), *Equipo* (Operaciones + Crecimiento), *Invitado/a* (solo Operaciones).

## Datos
Todo vive en la tabla `anm_state` de Supabase (la misma de siempre): `main` = Finanzas (sin cambios de formato), `ops`, `growth`, `team` = plataforma. Varias personas pueden editar a la vez: los cambios se fusionan registro por registro y se sincronizan cada ~20 s. Hay respaldo descargable en Ajustes.

**Seguridad:** la clave de Supabase es pública (está en el código), así que la contraseña y los roles evitan accesos casuales pero no son protección fuerte. Próximo paso recomendado: activar login por email de Supabase (Auth) y reglas RLS por rol.
