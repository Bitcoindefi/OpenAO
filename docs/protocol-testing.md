# Cómo probar el protocolo binario compartido

## 1. Probar el contrato aislado

Desde la raíz del repositorio:

```bash
cd packages/protocol
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

La suite tiene un fixture y un snapshot de bytes para cada opcode
cliente→servidor. Comprueba tres cosas distintas:

- que todos los opcodes sean únicos;
- que no pueda existir un opcode sin prueba;
- que `decode(encode(payload))` recupere el mismo payload y conserve el formato
  de bytes conocido, incluyendo strings UTF-8.

## 2. Comprobar ambos consumidores

```bash
cd server
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec eslint "src/**/*.ts"
pnpm build
```

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm lint
NEXT_PUBLIC_AOWEB_TEST_MODE=true pnpm build
```

En PowerShell, la última línea se ejecuta así:

```powershell
$env:NEXT_PUBLIC_AOWEB_TEST_MODE = "true"
pnpm build
```

## 3. Demostrar que el contrato protege ambos lados

Como prueba local temporal, renombrar `position` a `positionV2` únicamente en
`packages/protocol/src/opcodes.ts` y ejecutar los dos typechecks del paso 2.
Frontend y servidor deben fallar al compilar porque ambos consumen esa clave.
Revertir el cambio después de comprobarlo.

Si se cambia solamente el valor numérico de un opcode, `pnpm test` debe fallar
contra el snapshot de bytes. Esto evita publicar accidentalmente un cambio de
wire incompatible.

## 4. Prueba manual dentro del juego

Levantar API, server y frontend como indica el README. Entrar con un personaje y
recorrer esta lista mientras se observa la consola del server y la del navegador:

1. Conectar el personaje y caminar en las cuatro direcciones.
2. Escribir en el chat y confirmar que tildes y emoji llegan completos.
3. Usar, equipar, reordenar, tirar, recoger, comprar y vender un objeto.
4. Lanzar ataque cuerpo a cuerpo, a distancia y un hechizo.
5. Abrir banco, cambiar de pestaña, mover un objeto, depositar y retirar oro.
6. Abrir mercado, refrescar y cerrar; abrir retos y refrescar.
7. Abrir crafting y crear un objeto válido.
8. Salir y volver a entrar.

El resultado esperado es el mismo comportamiento previo, sin mensajes de
`Unknown client packet opcode`, `Cannot read ... bytes` ni `trailing bytes`.
Esos errores indican inmediatamente qué paquete no coincide con el contrato.
