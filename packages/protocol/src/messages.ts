import type { CraftingProfession } from "./clientPackets.js";

export interface CraftingMaterial {
    itemId: number;
    name: string;
    amount: number;
    owned: number;
}

export interface CraftingRecipe {
    itemId: number;
    name: string;
    grhIndex: number;
    details: string;
    stats: string;
    skill: number;
    category: string;
    materials: CraftingMaterial[];
}

export interface CraftingState {
    profession: CraftingProfession;
    title: string;
    recipes: CraftingRecipe[];
}

export interface MarketListingEntry {
    id: string;
    itemId: number;
    sellerName: string;
    itemName: string;
    itemGrhIndex: number;
    quantity: number;
    price: number;
    status: "active" | "sold" | "expired" | "cancelled";
    expiresAt: string;
    createdAt: string;
}

export interface MarketListingGroupEntry {
    itemId: number;
    itemName: string;
    itemGrhIndex: number;
    totalListings: number;
    totalQuantity: number;
    minUnitPrice: number;
    listings: MarketListingEntry[];
}

export interface MarketClaimEntry {
    id: string;
    claimType: "gold" | "item";
    goldAmount: number;
    itemName: string | null;
    itemGrhIndex: number | null;
    itemQuantity: number | null;
    createdAt: string;
}

export type MarketPriceSort = "recent" | "asc" | "desc";

export interface MarketState {
    npcName: string;
    publicationFeeBps: number;
    defaultDurationHours: number;
    maxDurationHours: number;
    hasMoreListings: boolean;
    listingGroups: MarketListingGroupEntry[];
    myListings: MarketListingEntry[];
    claims: MarketClaimEntry[];
}

export interface RetoParticipant {
    id: string;
    persistedId: string;
    name: string;
    level: number;
    className: string;
    raceName: string;
}

export interface RetoEntry {
    id: string;
    createdAt: number;
    teamSize: 1 | 2;
    proposer: RetoParticipant;
    participants: RetoParticipant[];
}

export interface RetosState {
    challenges: RetoEntry[];
}
