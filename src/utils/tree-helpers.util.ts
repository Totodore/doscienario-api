import { Node } from "src/models/node/node.entity";
import { Relationship, RelationshipType } from "src/models/relationship/relationship.entity";

/**
 * Get all rels to delete
 * Get all nodes to delete (if a node has no parent relationship)
 */
 export function removeNodeFromTree(id: number, nodes: Node[], rels: Relationship[]): RemoveObj {
  
  const removeRels = _nodeIterate(id, rels);
  
  //add parent rels of the deleted node
  const parentRels = rels.filter(rel => rel.childId === id).map(el => el.id);
  removeRels.push(...parentRels);
  
  const keepingRelsChildId = rels.filter(el => !removeRels.includes(el.id)).map(el => el.childId);
  
  //if a node has no parent relation we remove it
  nodes = nodes.filter(node => !keepingRelsChildId.includes(node.id));
  rels = rels.filter(el => removeRels.includes(el.id));

  return { rels, nodes };
}
/**
 * @returns all relationships to delete
 */
function _nodeIterate(nodeId: number, rels: Relationship[]): number[] {
  const removeRels: number[] = [];
  for (const rel of rels) {
    if (rel.parentId === nodeId && rel.type == RelationshipType.Direct) {
      removeRels.push(rel.id, ..._nodeIterate(rel.childId, rels));
    }
    else if (rel.type == RelationshipType.Loopback && (rel.childId == nodeId || rel.parentId == nodeId)) {
      removeRels.push(rel.id);
    }
  }
  return removeRels;
}

interface RemoveObj {
  nodes: Node[];
  rels: Relationship[];
}
