/**
 * Bitcoindefi/OpenAO - weather-cycle
 */
export type Weather = "sun"|"rain"|"fog"; export function nextWeather(curr: Weather): Weather { return curr === "sun" ? "rain" : curr === "rain" ? "fog" : "sun"; }
