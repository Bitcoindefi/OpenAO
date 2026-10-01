export type DuplicateAccountPolicyEntry = {
    idUser: string;
    accountId?: string | null;
    miningActive: boolean;
};

export function getDuplicateAccountIdlePenalizedClientIds(
    entries: DuplicateAccountPolicyEntry[],
): Set<string> {
    const penalizedClientIds = new Set<string>();
    const clientsByAccount = new Map<string, DuplicateAccountPolicyEntry[]>();

    for (const entry of entries) {
        const accountId = entry.accountId?.trim();

        // Never fall back to public IP when the authenticated account identity is absent.
        if (!accountId) {
            continue;
        }

        const accountEntries = clientsByAccount.get(accountId) ?? [];
        accountEntries.push(entry);
        clientsByAccount.set(accountId, accountEntries);
    }

    for (const accountEntries of clientsByAccount.values()) {
        if (accountEntries.length < 2 || !accountEntries.some((entry) => entry.miningActive)) {
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
