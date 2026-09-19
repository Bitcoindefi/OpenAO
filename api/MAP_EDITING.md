# Permisos de edicion de mapas

Aplicar `schema.sql` con el mecanismo de migracion habitual antes de desplegar.
La tabla `game_map_editors` asigna cuentas a mapas individuales. Ejemplo, usando
el UUID real de una cuenta:

```sql
INSERT INTO game_map_editors (account_id, map_num)
VALUES ('00000000-0000-0000-0000-000000000001', 50)
ON CONFLICT DO NOTHING;

DELETE FROM game_map_editors
WHERE account_id = '00000000-0000-0000-0000-000000000001' AND map_num = 50;
```

No hay endpoint publico para otorgar permisos. La cuenta asignada puede consultar
los catalogos de objetos/NPCs, pero no modificar sus definiciones ni subir
graficos globales. Esas acciones siguen reservadas al administrador.

`GAME_DATA_ADMIN_ACCOUNT_ID` o `GAME_DATA_ADMIN_EMAIL` identifica al administrador.
`GAME_DATA_ADMIN_PROXY_TOKEN` autentica el proxy de Next; no sustituye la sesion
de la cuenta. El navegador solo envia su cookie y la API deriva el actor de esa
sesion, sin aceptar un account ID del cuerpo o de encabezados del cliente.

`GAME_DATA_PROTECTED_MAP_IDS` contiene enteros positivos separados por comas;
por defecto protege el mapa 1. La escritura requiere **ambos**: una sesion de
administrador y `x-protected-map-override: true`. Un permiso individual no
habilita este override. El editor muestra un consentimiento por mapa que se
reinicia al cambiar de mapa; el proxy solo transmite el valor literal `true`
para PUT, POST y DELETE de mapas.

## Atribucion y fallos

`game_map_edit_audit` conserva mapa, cuenta, accion, detalles y fecha. Los cambios
SQL y su auditoria se confirman en la misma transaccion, incluyendo los borrados.
El UUID del actor permanece en el registro aunque se elimine la cuenta.

Los NPCs de `npcs.json` utilizan otra ruta de almacenamiento. La API registra
primero una intencion durable con snapshots `before` y `after`, reemplaza el
archivo mediante rename y despues marca `details.outcome = applied`. Si falla
el reemplazo, intenta marcar `failed`; si se corta el proceso o la conexion,
puede quedar `pending`. No hay transaccion atomica entre PostgreSQL y archivos.

Ante un registro pendiente, detener las escrituras de ese mapa y comparar el
archivo con los snapshots, siguiendo el orden de los registros. No reintentar
automaticamente ni interpretar `pending` como un cambio confirmado. Si el
archivo coincide con `after`, verificar tambien si hubo escrituras posteriores;
si coincide con `before`, el cambio puede no haberse aplicado. Un resultado
distinto necesita revision del operador. Conservar siempre el registro original.

Las operaciones de NPC usan el bloqueo por mapa ya existente del proceso.
No desplegar varios escritores sobre el mismo directorio sin un mecanismo de
bloqueo compartido. `GAME_DATA_MAPS_SOURCE_DIR` permite configurar ese directorio;
por defecto se mantiene `src/mapas_source`.

## Verificacion

Con PostgreSQL disponible y `DATABASE_URL` / `TOKEN_AUTH` configurados:

```sh
pnpm exec tsc --noEmit
pnpm exec vitest run src/tests/map-permissions.integration.test.ts
```

La suite crea un esquema PostgreSQL y un directorio efimeros, inicia su propia
API y elimina sus fixtures al terminar. Requiere permiso para crear esquemas.
Ejercita HTTP real y los handlers reales del proxy; solo simula las cookies y
las dependencias de Next, no el fetch hacia la API. No necesita el servidor
Next para esas pruebas. Los tests visuales y el build del frontend son checks
separados.
