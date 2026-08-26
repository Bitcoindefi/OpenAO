/**
 * Bitcoindefi/OpenAO - Multi-layer tile opacity & blend mode validator
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface LayerRenderConfig {
  layerIndex: number;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
}

export function validateLayerRenderConfig(config: Partial<LayerRenderConfig>): LayerRenderConfig {
  const layerIndex = Math.max(0, Math.floor(config.layerIndex ?? 0));
  const opacity = Math.min(1.0, Math.max(0.0, config.opacity ?? 1.0));
  const validBlendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay'];
  const blendMode = validBlendModes.includes(config.blendMode as BlendMode) ? (config.blendMode as BlendMode) : 'normal';
  const visible = config.visible !== false;

  return { layerIndex, opacity, blendMode, visible };
}
