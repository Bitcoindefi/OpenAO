/**
 * Bitcoindefi/OpenAO - npc-dialogue-tree
 */
export function getNextDialogueNode(nodes: any[], currId: string, choiceIndex: number): any { return nodes.find(n => n.id === currId)?.choices[choiceIndex]?.targetNode; }
