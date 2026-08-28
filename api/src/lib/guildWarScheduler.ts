/**
 * Weekly Guild War & Territory Control Siege Scheduler for OpenAO MMORPG.
 * Manages active siege windows (including midnight spanning), King of the Hill point accumulation,
 * and tie-breaking defense ownership retention.
 */

export interface SiegeWindow {
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startHour: number; // 0 to 23
    endHour: number;   // 0 to 23
}

export interface TerritoryState {
    territoryId: string;
    controllingGuildId: string | null;
    siegeWindow: SiegeWindow;
    isSiegeActive: boolean;
    currentWarScores: Map<string, number>;
    capturePointHolderGuildId: string | null;
}

export class GuildWarScheduler {
    private static readonly SCORE_PER_TICK = 10;

    /**
     * Determines if a given UTC Date falls within the configured Siege Window.
     * Supports standard intra-day windows (e.g. 20:00-22:00) and midnight-spanning windows (e.g. 22:00-02:00).
     */
    public static isTimeInSiegeWindow(currentDate: Date, window: SiegeWindow): boolean {
        const currentDay = currentDate.getUTCDay();
        const currentHour = currentDate.getUTCHours();

        if (window.startHour < window.endHour) {
            // Standard window within the same day
            return currentDay === window.dayOfWeek && currentHour >= window.startHour && currentHour < window.endHour;
        } else if (window.startHour > window.endHour) {
            // Midnight spanning window (e.g. Saturday 22:00 to Sunday 02:00)
            const nextDay = (window.dayOfWeek + 1) % 7;
            const isStartDay = currentDay === window.dayOfWeek && currentHour >= window.startHour;
            const isNextDay = currentDay === nextDay && currentHour < window.endHour;
            return isStartDay || isNextDay;
        } else {
            // startHour === endHour represents 24-hour siege for that day
            return currentDay === window.dayOfWeek;
        }
    }

    /**
     * Executes the server tick for territory control, accumulating points and resolving wars.
     */
    public static tickTerritory(territory: TerritoryState, currentDate: Date): void {
        const currentlyInWindow = this.isTimeInSiegeWindow(currentDate, territory.siegeWindow);

        // 1. Transition into Siege Mode
        if (currentlyInWindow && !territory.isSiegeActive) {
            territory.isSiegeActive = true;
            territory.currentWarScores.clear();
            territory.capturePointHolderGuildId = null;
        }

        // 2. Accumulate Scores if Siege is Active
        if (territory.isSiegeActive && currentlyInWindow) {
            if (territory.capturePointHolderGuildId) {
                const guild = territory.capturePointHolderGuildId;
                const currentScore = territory.currentWarScores.get(guild) || 0;
                territory.currentWarScores.set(guild, currentScore + this.SCORE_PER_TICK);
            }
        }

        // 3. Resolve Siege if time has expired
        if (territory.isSiegeActive && !currentlyInWindow) {
            this.resolveSiege(territory);
        }
    }

    /**
     * Finalizes the siege and transfers territory ownership with defender tie-break priority.
     */
    public static resolveSiege(territory: TerritoryState): void {
        territory.isSiegeActive = false;

        const defenderGuild = territory.controllingGuildId;
        const defenderScore = defenderGuild ? (territory.currentWarScores.get(defenderGuild) || 0) : 0;

        let highestAttackerScore = 0;
        let winningAttackerGuildId: string | null = null;

        for (const [guildId, score] of territory.currentWarScores.entries()) {
            if (guildId !== defenderGuild) {
                if (score > highestAttackerScore) {
                    highestAttackerScore = score;
                    winningAttackerGuildId = guildId;
                }
            }
        }

        // Defender retains control on ties; attacker must strictly outscore defender to usurp
        if (winningAttackerGuildId && highestAttackerScore > defenderScore) {
            territory.controllingGuildId = winningAttackerGuildId;
        }

        territory.currentWarScores.clear();
        territory.capturePointHolderGuildId = null;
    }
}