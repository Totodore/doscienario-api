export function removeNodeFromTree(id: number, nodes: number[], rels: Tuple[]): RemoveObj {
  const removeRels = nodeIterate(id, rels);
  //add parent rels of the deleted node
  removeRels.push(...rels.filter(rel => rel[1] === id).map(el => el[2]));
  const keepingRelsChildId = rels.filter(el => !removeRels.includes(el[2])).map(el => el[1]);
  //if a node has no parent relation we remove it
  const removeNodes = nodes.filter(node => !keepingRelsChildId.includes(node));
  return { rels: removeRels, nodes: removeNodes };
}

function nodeIterate(parentId: number, rels: Tuple[]): number[] {
  const removeRels: number[] = [];
  for (const rel of rels) {
    if (rel[0] === parentId) {
      removeRels.push(rel[2], ...nodeIterate(rel[1], rels));
    }
  }
  return removeRels;
}

interface RemoveObj {
  nodes: number[];
  rels: number[];
}
// 0: parent, 1: child, 2: id
type Tuple = [number, number, number];
