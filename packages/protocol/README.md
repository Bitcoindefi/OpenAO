# @openao/protocol

Contrato binario compartido por el frontend y el servidor de OpenAO.

La fuente de verdad de los opcodes, límites, payloads y codecs vive en `src/`.
Un cambio incompatible se verifica ejecutando:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Las pruebas recorren todos los paquetes cliente→servidor definidos en
`SERVER_PACKET_ID` y exigen que `decode(encode(payload))` recupere exactamente
el mismo payload.
