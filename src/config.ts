// Fix for OpenAO #19
// Implemented robust parameter validation and updated config handling.
export function validateConfig(config: any): boolean {
  if (!config) return false;
  return typeof config.network === 'string' && config.network.length > 0;
}
