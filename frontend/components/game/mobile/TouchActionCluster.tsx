"use client";

type TouchActionClusterProps = {
    onAttack: () => void;
    onCastSpell: () => void;
    onUseItem: () => void;
    onPickup: () => void;
    onToggleSeguro: () => void;
    onOpenChat: () => void;
    onTogglePanel: () => void;
};

function ActionButton({
    label,
    sublabel,
    onPress,
    className,
}: {
    label: string;
    sublabel?: string;
    onPress: () => void;
    className: string;
}) {
    return (
        <button
            type="button"
            className={`touch-none select-none rounded-full border text-white shadow-lg backdrop-blur active:scale-95 ${className}`}
            onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPress();
            }}
            aria-label={label}
        >
            <span className="block text-[11px] font-semibold leading-tight">
                {label}
            </span>
            {sublabel ? (
                <span className="block text-[9px] uppercase tracking-wide opacity-80">
                    {sublabel}
                </span>
            ) : null}
        </button>
    );
}

export default function TouchActionCluster({
    onAttack,
    onCastSpell,
    onUseItem,
    onPickup,
    onToggleSeguro,
    onOpenChat,
    onTogglePanel,
}: TouchActionClusterProps) {
    return (
        <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex gap-2">
                <ActionButton
                    label="Panel"
                    onPress={onTogglePanel}
                    className="h-11 w-11 bg-slate-900/75 border-slate-500/60"
                />
                <ActionButton
                    label="Chat"
                    onPress={onOpenChat}
                    className="h-11 w-11 bg-slate-900/75 border-slate-500/60"
                />
                <ActionButton
                    label="Safe"
                    onPress={onToggleSeguro}
                    className="h-11 w-11 bg-amber-700/80 border-amber-300/50"
                />
            </div>
            <div className="flex items-end gap-2">
                <ActionButton
                    label="Agarrar"
                    sublabel="mundo"
                    onPress={onPickup}
                    className="h-12 w-12 bg-teal-700/80 border-teal-200/40"
                />
                <ActionButton
                    label="Usar"
                    sublabel="item"
                    onPress={onUseItem}
                    className="h-14 w-14 bg-emerald-700/85 border-emerald-200/50"
                />
                <ActionButton
                    label="Hechizo"
                    onPress={onCastSpell}
                    className="h-14 w-14 bg-violet-700/85 border-violet-200/50"
                />
                <ActionButton
                    label="Atacar"
                    onPress={onAttack}
                    className="h-16 w-16 bg-rose-700/90 border-rose-200/60 text-sm"
                />
            </div>
        </div>
    );
}
