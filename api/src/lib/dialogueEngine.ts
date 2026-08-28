/**
 * Branching Dialogue Tree Traversal Engine for OpenAO MMORPG.
 * Simulates conditional player choices, variable interpolation, in-game actions,
 * and safe terminal leaf node navigation.
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
     * Safely retrieves the next node following a player choice without throwing on terminal leaf nodes.
     */
    public static getNextDialogueNode(
        graph: DialogueTreeGraph,
        currentNodeId: string,
        choiceIndex: number
    ): DialogueNode | undefined {
        const currentNode = graph.nodes.get(currentNodeId);
        if (!currentNode || !currentNode.choices || !Array.isArray(currentNode.choices)) {
            return undefined; // Terminal node or node not found
        }

        const choice = currentNode.choices[choiceIndex];
        if (!choice || !choice.nextNodeId) {
            return undefined;
        }

        return graph.nodes.get(choice.nextNodeId);
    }

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
     * Interpolates dynamic player variables into dialogue text ({playerName}, {gold}, {karma}).
     */
    public static interpolateText(rawText: string, player: PlayerDialogueContext): string {
        return rawText
            .replace(/\{playerName\}/g, player.playerName)
            .replace(/\{gold\}/g, player.gold.toLocaleString())
            .replace(/\{karma\}/g, player.karma.toString());
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