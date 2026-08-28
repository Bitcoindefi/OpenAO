/**
 * Branching Dialogue Tree Traversal Engine for OpenAO MMORPG.
 * Simulates conditional player choices, atomic single-pass variable interpolation,
 * in-game actions, and safe terminal leaf node navigation with eligibility filtering.
 */

export interface DialogueChoice {
    choiceId: string;
    text: string;
    nextNodeId: string | null; // null indicates dialogue termination
    minKarma?: number;
    minGold?: number;
    requiredQuestId?: string;
}

export interface DialogueNode {
    nodeId: string;
    speakerName: string;
    text: string;
    choices?: DialogueChoice[]; // Optional: terminal leaf nodes have no choices
    actionTrigger?: "TAKE_GOLD" | "START_QUEST" | "TELEPORT" | "OPEN_SHOP";
    actionPayload?: Record<string, any>;
}

export interface DialogueTreeGraph {
    treeId: string;
    rootNodeId: string;
    nodes: Map<string, DialogueNode>;
}

export interface PlayerDialogueContext {
    playerId: string;
    playerName: string;
    karma: number;
    gold: number;
    completedQuestIds: Set<string>;
}

export class DialogueEngine {
    /**
     * Filters available choices based on player stats and quest prerequisites.
     */
    public static getEligibleChoices(
        node: DialogueNode,
        player: PlayerDialogueContext
    ): DialogueChoice[] {
        if (!node.choices || !Array.isArray(node.choices)) {
            return [];
        }

        return node.choices.filter((choice) => {
            if (choice.minKarma !== undefined && player.karma < choice.minKarma) {
                return false;
            }
            if (choice.minGold !== undefined && player.gold < choice.minGold) {
                return false;
            }
            if (choice.requiredQuestId && !player.completedQuestIds.has(choice.requiredQuestId)) {
                return false;
            }
            return true;
        });
    }

    /**
     * Safely retrieves the next node following a player choice by choiceId or eligible index.
     * Enforces prerequisite checks against player context if supplied.
     */
    public static getNextDialogueNode(
        graph: DialogueTreeGraph,
        currentNodeId: string,
        choiceIdentifier: string | number,
        player?: PlayerDialogueContext
    ): DialogueNode | undefined {
        const currentNode = graph.nodes.get(currentNodeId);
        if (!currentNode || !currentNode.choices || !Array.isArray(currentNode.choices)) {
            return undefined; // Terminal node or node not found
        }

        let choice: DialogueChoice | undefined;

        if (typeof choiceIdentifier === "string") {
            choice = currentNode.choices.find((c) => c.choiceId === choiceIdentifier);
        } else {
            // Index-based selection: if player context is provided, index into eligible choices
            const choicesList = player ? this.getEligibleChoices(currentNode, player) : currentNode.choices;
            choice = choicesList[choiceIdentifier];
        }

        if (!choice || !choice.nextNodeId) {
            return undefined;
        }

        // Validate player eligibility if player context is provided
        if (player) {
            if (choice.minKarma !== undefined && player.karma < choice.minKarma) return undefined;
            if (choice.minGold !== undefined && player.gold < choice.minGold) return undefined;
            if (choice.requiredQuestId && !player.completedQuestIds.has(choice.requiredQuestId)) return undefined;
        }

        return graph.nodes.get(choice.nextNodeId);
    }

    /**
     * Interpolates dynamic player variables atomically in a single pass to prevent nested placeholder injection.
     */
    public static interpolateText(rawText: string, player: PlayerDialogueContext): string {
        const values: Record<string, string> = {
            playerName: player.playerName,
            gold: player.gold.toString(),
            karma: player.karma.toString(),
        };

        return rawText.replace(/\{(playerName|gold|karma)\}/g, (_match, key) => values[key] ?? "");
    }

    /**
     * Validates graph integrity, identifying missing nextNodeId references.
     */
    public static validateGraph(graph: DialogueTreeGraph): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!graph.nodes.has(graph.rootNodeId)) {
            errors.push(`Root node '${graph.rootNodeId}' is missing from graph.`);
        }

        for (const [nodeId, node] of graph.nodes.entries()) {
            if (node.choices) {
                for (const choice of node.choices) {
                    if (choice.nextNodeId !== null && !graph.nodes.has(choice.nextNodeId)) {
                        errors.push(`Node '${nodeId}' has choice pointing to missing nextNodeId '${choice.nextNodeId}'.`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}