import { describe, it, expect } from "vitest";
import { DialogueEngine, DialogueTreeGraph, PlayerDialogueContext, DialogueNode } from "../lib/dialogueEngine.js";

describe("DialogueEngine Refined Branching & Terminal Leaf Safety", () => {
    const player: PlayerDialogueContext = {
        playerId: "p1",
        playerName: "Arthur",
        karma: 50,
        gold: 100,
        completedQuestIds: new Set(["intro_quest"]),
    };

    const terminalNode: DialogueNode = {
        nodeId: "farewell_node",
        speakerName: "Elder",
        text: "Safe travels, {playerName}.",
        // No choices property (terminal leaf node)
    };

    const rootNode: DialogueNode = {
        nodeId: "root_01",
        speakerName: "Elder",
        text: "Greetings {playerName}, you have {gold} gold.",
        choices: [
            { choiceId: "c1", text: "Goodbye.", nextNodeId: "farewell_node" },
            { choiceId: "c2", text: "Expensive secret (500 gold)", nextNodeId: "secret_node", minGold: 500 },
        ],
    };

    const graph: DialogueTreeGraph = {
        treeId: "elder_chat",
        rootNodeId: "root_01",
        nodes: new Map([
            ["root_01", rootNode],
            ["farewell_node", terminalNode],
        ]),
    };

    it("safely handles terminal leaf nodes without choices without throwing exceptions", () => {
        // Traversing from terminal node should return undefined without throwing TypeError
        const next = DialogueEngine.getNextDialogueNode(graph, "farewell_node", 0);
        expect(next).toBeUndefined();
    });

    it("filters choices based on gold and karma requirements", () => {
        const eligible = DialogueEngine.getEligibleChoices(rootNode, player);
        expect(eligible.length).toBe(1);
        expect(eligible[0].choiceId).toBe("c1");
    });

    it("interpolates dynamic player variables into dialogue text", () => {
        const rendered = DialogueEngine.interpolateText(rootNode.text, player);
        expect(rendered).toBe("Greetings Arthur, you have 100 gold.");
    });
});