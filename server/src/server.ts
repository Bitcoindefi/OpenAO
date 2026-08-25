import { config } from "./config";
import { logger } from "./logger";
import { GameServer } from "./gameServer";
import { funct } from "./funct";
import { performance } from "perf_hooks";

const server = new GameServer();

async function start() {
  try {
    logger.info("Iniciando servidor de juego...");
    
    // Verificar conexión con la API
    const apiHealth = await funct.fetchUrl("/health", { method: "GET" });
    if (!apiHealth || apiHealth.status !== "ok") {
      throw new Error("API no responde correctamente");
    }
    logger.info("API respondiendo correctamente");

    // Reset de personajes conectados al arrancar (si está habilitado)
    if (config.resetConnectedCharactersOnStartup) {
      logger.info("Reseteando personajes conectados al arranque...");
      await funct.fetchUrl("/internal/characters/reset-connected", { method: "POST" });
      logger.info("Personajes conectados reseteados");
    }

    // Iniciar servidor WebSocket
    await server.start(config.port);
    logger.info(`Servidor de juego escuchando en puerto ${config.port}`);

    // Manejo de señales de apagado
    let isShuttingDown = false;
    
    async function gracefulShutdown(signal: string) {
      if (isShuttingDown) {
        logger.warn(`Señal ${signal} recibida durante apagado, forzando salida...`);
        process.exit(1);
      }
      isShuttingDown = true;
      logger.info(`Señal ${signal} recibida, iniciando apagado graceful...`);

      try {
        // Notificar a clientes conectados que el servidor se va a apagar
        logger.info("Notificando a clientes conectados...");
        server.broadcastShutdown();
        
        // Dar un poco de tiempo para que los clientes reciban el mensaje
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Desmarcar personajes conectados en la API
        logger.info("Desmarcando personajes conectados en la API...");
        const resetPromise = funct.fetchUrl("/internal/characters/reset-connected", { method: "POST" });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout reseteando personajes")), 5000)
        );
        
        await Promise.race([resetPromise, timeoutPromise]);
        logger.info("Personajes conectados desmarcados correctamente");
      } catch (error) {
        logger.error("Error durante apagado graceful:", error);
      } finally {
        // Cerrar servidor WebSocket
        logger.info("Cerrando servidor WebSocket...");
        server.stop();
        logger.info("Apagado completado");
        process.exit(0);
      }
    }

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (error) {
    logger.error("Error fatal al iniciar el servidor:", error);
    process.exit(1);
  }
}

start();
