# AOWeb / OpenAO

**Argentum Online jugable en el navegador.** Sin instalar nada, sin descargar cliente.

## 🎮 Jugar ahora

### **https://openao.cosmosapp.lat/**


---

## Cómo empezar a jugar

### 1. Crear cuenta o iniciar sesión

Entrá a [openao.cosmosapp.lat](https://openao.cosmosapp.lat/) y registrate con tu correo. Si ya tenés cuenta, iniciá sesión con tu correo o nombre de usuario.

![Pantalla de inicio de sesion](screenshots/guia-1-login.png)

### 2. Crear un personaje

Elegí nombre, género, clase y raza. Tenés las ocho clases clásicas (Mago, Clérigo, Guerrero, Asesino, Bardo, Druida, Paladín, Cazador) y las cinco razas (Humano, Elfo, Elfo Drow, Enano, Gnomo). El panel de la derecha te muestra el aspecto y las estadísticas iniciales antes de confirmar.

![Creacion de personaje](screenshots/guia-2-crear-personaje.png)

### 3. Seleccionar el personaje

Desde "Personajes" elegí con cuál entrar. Podés tener varios.

![Seleccion de personaje](screenshots/guia-3-seleccion-personaje.png)

### 4. Jugar

Empezás en la Ciudad de Ullathorpe. A la derecha tenés tu inventario, hechizos, vida, maná y el minimapa; abajo la barra de accesos rápidos, y arriba la consola de chat con los canales.

![Jugando en Ullathorpe](screenshots/guia-4-jugando.png)

### Controles

| Acción | Tecla |
|---|---|
| Moverse | `W` `A` `S` `D` |
| Atacar o apuntar | `Espacio` |
| Agarrar ítem | `Q` |
| Equipar ítem | `E` |
| Usar ítem | `U` |
| Tirar ítem | `T` |
| Meditar | `N` |
| Abrir o cerrar mapa | `M` |
| Activar o desactivar seguro | `K` |
| Seguro de clan | `J` |
| Chat | `Enter` |
| Cancelar o cerrar | `Esc` |

Todas las teclas se pueden reasignar desde el panel derecho, dentro del juego.

---

## Desarrollo

Lo que sigue es para levantar el proyecto localmente.

### Requisitos

- Node.js 22 o superior
- pnpm
- Docker, recomendado para PostgreSQL
- psql, opcional si preferis restaurar el dump desde el host

### 1. Levantar La Base De Datos

El dump inicial del juego está en `database/aoweb.sql`.

#### Opción A: Docker Compose con persistencia de datos (Recomendado)
Para persistir los datos de forma permanente entre reinicios:
```bash
docker compose -f api/docker-compose.postgres.yml up -d
```
> **Nota de volumen en PostgreSQL 18+**: Las imágenes `postgres:18-alpine` montan el volumen en `/var/lib/postgresql` para compatibilidad con clusters.

Restaurar la base:
```bash
docker exec -i aoweb-postgres psql -U postgres -d aoweb < database/aoweb.sql
```

#### Opción B: Contenedor efímero simple
Desde la carpeta padre del proyecto:

```bash
docker run --name aoweb-postgres \
  -e POSTGRES_DB=aoweb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 127.0.0.1:5432:5432 \
  -d postgres:18-alpine
```

Restaurar la base:

```bash
docker exec -i aoweb-postgres psql -U postgres -d aoweb < database/aoweb.sql
```

La URL local para la API queda:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aoweb
```

### 2. Levantar La API

Crear `api/.env` tomando como base `api/.env.example`:

```bash
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aoweb
TOKEN_AUTH=changeme
CORS_ORIGIN=http://localhost:3000
SITE_URL=http://localhost:3000
```

Instalar dependencias y levantar en desarrollo:

```bash
cd api
pnpm install
pnpm dev
```

La API queda en `http://localhost:3001`.

> `SITE_URL` es la base que se usa para armar los enlaces de los correos, por ejemplo el de recuperación de contraseña. Si no se define, toma un valor por defecto que apunta a otro dominio y los enlaces llegan rotos. En producción tiene que ser `https://openao.cosmosapp.lat`.

### 3. Levantar El Server Del Juego

En otra terminal, crear `server/.env` tomando como base `server/.env.example`:

```bash
NODE_ENV=development
AOWEB_TEST_MODE=false
INITIAL_ONLINE_RECORD=0
PORT=7666
API_BASE_URL=http://127.0.0.1:3001
RESET_CONNECTED_CHARACTERS_ON_STARTUP=false
TOKEN_AUTH=changeme
```

Instalar dependencias y levantar:

```bash
cd server
pnpm install
pnpm dev
```

El server WebSocket queda en `ws://localhost:7666`.

> El server del juego consulta la API al arrancar. Levantá primero la API: si no responde, el proceso termina con un error de conexión.

### 4. Levantar El Frontend

En otra terminal, crear `frontend/.env.local` tomando como base `frontend/.env.example`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001
TOKEN_AUTH=changeme
NEXT_PUBLIC_WS_URL=ws://localhost:7666
```

Instalar dependencias y levantar:

```bash
cd frontend
pnpm install
pnpm dev
```

Abrir `http://localhost:3000`.

## Arquitectura

| Componente | Carpeta | Puerto |
|---|---|---|
| API REST, autenticación y datos del juego | `api/` | 3001 |
| Server del juego, WebSocket con protocolo binario | `server/` | 7666 |
| Frontend, Next.js + PixiJS | `frontend/` | 3000 |
| PostgreSQL | `database/aoweb.sql` | 5432 |

## Contribuir

Las issues abiertas están en [github.com/Bitcoindefi/OpenAO/issues](https://github.com/Bitcoindefi/OpenAO/issues).

El proyecto grande en curso es el **modo construcción** ([#2](https://github.com/Bitcoindefi/OpenAO/issues/2)): editar el mundo del juego desde el navegador y publicar los cambios en vivo. Está dividido en etapas, y las que empiezan por `etapa-0-base` son las que desbloquean el resto.

Si querés arrancar por algo chico, mirá las etiquetadas [`good first issue`](https://github.com/Bitcoindefi/OpenAO/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Capturas

![Captura 1](screenshots/1.jpg)

![Captura 2](screenshots/2.jpg)

![Captura 3](screenshots/3.jpg)

![Captura 4](screenshots/4.jpg)
