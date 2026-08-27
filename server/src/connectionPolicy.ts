export type DuplicateAccountPolicyEntry = {
    idUser: string;
    accountId?: string | null;
    ip?: string | null;
    miningActive: boolean;
};

export function getDuplicateAccountIdlePenalizedClientIds(
    entries: DuplicateAccountPolicyEntry[],
): Set<string> {
    const penalizedClientIds = new Set<string>();
    const clientsByAccount = new Map<string, DuplicateAccountPolicyEntry[]>();

    for (const entry of entries) {
        const accountId = entry.accountId?.trim();

        if (!accountId) {
            continue;
        }

        const accountEntries = clientsByAccount.get(accountId) ?? [];
        accountEntries.push(entry);
        clientsByAccount.set(accountId, accountEntries);
    }

    for (const accountEntries of clientsByAccount.values()) {
        if (accountEntries.length < 2) {
            continue;
        }

        const hasActiveMiner = accountEntries.some(
            (entry) => entry.miningActive,
        );

        if (!hasActiveMiner) {
            continue;
        }

        for (const entry of accountEntries) {
            if (!entry.miningActive) {
                penalizedClientIds.add(entry.idUser);
            }
        }
    }

    return penalizedClientIds;
}
