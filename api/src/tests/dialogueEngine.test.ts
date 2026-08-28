import { describe, it, expect } from "vitest";
import { DialogueEngine, DialogueTreeGraph, PlayerDialogueContext, DialogueNode } from "../lib/dialogueEngine.js";

describe("DialogueEngine Atomic Interpolation & Choice Eligibility Gating", () => {
    const player: PlayerDialogueContext = {
        playerId: "p1",
        playerName: "{gold}", // Injection test: player name looks like another placeholder
        karma: 50,
        gold: 100,
        completedQuestIds: new Set(["intro_quest"]),
    };

    const terminalNode: DialogueNode = {
        nodeId: "farewell_node",
        speakerName: "Elder",
        text: "Safe travels, {playerName}.",
    };

    const secretNode: DialogueNode = {
        nodeId: "secret_node",
        speakerName: "Elder",
        text: "The sacred treasure lies in the north.",
    };

    const rootNode: DialogueNode = {
        nodeId: "root_01",
        speakerName: "Elder",
        text: "Greetings {playerName}, you have {gold} gold.",
        choices: [
            { choiceId: "c1", text: "Expensive secret (500 gold)", nextNodeId: "secret_node", minGold: 500 },
            { choiceId: "c2", text: "Goodbye.", nextNodeId: "farewell_node" },
        ],
    };

    const graph: DialogueTreeGraph = {
        treeId: "elder_chat",
        rootNodeId: "root_01",
        nodes: new Map([
            ["root_01", rootNode],
            ["farewell_node", terminalNode],
            ["secret_node", secretNode],
        ]),
    };

    it("prevents nested placeholder injection during text interpolation", () => {
        // Since playerName is "{gold}", a single-pass replacer will output "{gold}" literally and not replace it with 100
        const text = "Hello {playerName}, your balance is {gold}.";
        const rendered = DialogueEngine.interpolateText(text, player);
        expect(rendered).toBe("Hello {gold}, your balance is 100.");
    });

    it("gates choice selection so ineligible choices cannot be traversed", () => {
        // Player only has 100 gold, so eligible choices is only [c2]
        const eligible = DialogueEngine.getEligibleChoices(rootNode, player);
        expect(eligible.length).toBe(1);
        expect(eligible[0].choiceId).toBe("c2");

        // Traversing eligible index 0 selects c2 (farewell_node)
        const next = DialogueEngine.getNextDialogueNode(graph, "root_01", 0, player);
        expect(next?.nodeId).toBe("farewell_node");

        // Attempting to directly select c1 by ID is rejected due to lack of gold
        const blockedNext = DialogueEngine.getNextDialogueNode(graph, "root_01", "c1", player);
        expect(blockedNext).toBeUndefined();
    });
});