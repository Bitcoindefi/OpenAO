import fs = require("fs");
import path = require("path");

type RuntimeConfig = {
    nodeEnv: string;
    isTestDeployment: boolean;
    initialOnlineRecord: number;
    resetConnectedCharactersOnStartup: boolean;
    port: number;
    apiBaseUrl: string;
    tokenAuth: string;
    projectRoot: string;
    distRoot: string;
};

const projectRoot = path.resolve(__dirname, "..");
const distRoot = __dirname;

function readEnvFile() {
    const envPath = path.join(projectRoot, ".env");

    if (!fs.existsSync(envPath)) {
        return;
    }

    const raw = fs.readFileSync(envPath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmed.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

function getRequiredEnv(name: string, fallback = "") {
    const value = process.env[name] ?? fallback;

    return value;
}

readEnvFile();

const config: RuntimeConfig = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isTestDeployment: process.env.AOWEB_TEST_MODE === "true",
    initialOnlineRecord: Number(process.env.INITIAL_ONLINE_RECORD ?? 0),
    resetConnectedCharactersOnStartup: process.env.RESET_CONNECTED_CHARACTERS_ON_STARTUP === "true",
    port: Number(process.env.PORT ?? 7666),
    apiBaseUrl: getRequiredEnv("API_BASE_URL", "http://127.0.0.1:3001"),
    tokenAuth: getRequiredEnv("TOKEN_AUTH", "changeme"),
    projectRoot,
    distRoot,
};

module.exports = config;
