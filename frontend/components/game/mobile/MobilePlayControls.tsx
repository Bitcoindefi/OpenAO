"use client";

import VirtualAnalogStick from "./VirtualAnalogStick";
import TouchActionCluster from "./TouchActionCluster";

type MobilePlayControlsProps = {
    enabled: boolean;
    onStickVector: (x: number, y: number) => void;
    onStickRelease: () => void;
    onAttack: () => void;
    onCastSpell: () => void;
    onUseItem: () => void;
    onPickup: () => void;
    onToggleSeguro: () => void;
    onOpenChat: () => void;
    onTogglePanel: () => void;
};

export default function MobilePlayControls({
    enabled,
    onStickVector,
    onStickRelease,
    onAttack,
    onCastSpell,
    onUseItem,
    onPickup,
    onToggleSeguro,
    onOpenChat,
    onTogglePanel,
}: MobilePlayControlsProps) {
    if (!enabled) {
        return null;
    }

    return (
        <div className="pointer-events-none absolute inset-0 z-40">
            <div className="pointer-events-auto absolute bottom-4 left-3">
                <VirtualAnalogStick
                    onVector={onStickVector}
                    onRelease={onStickRelease}
                />
            </div>
            <div className="absolute bottom-4 right-3">
                <TouchActionCluster
                    onAttack={onAttack}
                    onCastSpell={onCastSpell}
                    onUseItem={onUseItem}
                    onPickup={onPickup}
                    onToggleSeguro={onToggleSeguro}
                    onOpenChat={onOpenChat}
                    onTogglePanel={onTogglePanel}
                />
            </div>
        </div>
    );
}
