export type BubbleGroupCandidate = {
  username: string;
  run_id?: string | null;
};

export type BubbleGroup = {
  id: string;
  sortKey: string;
  members: string[];
  representative: string;
};

function groupIdFor(candidate: BubbleGroupCandidate): string {
  return candidate.run_id ?? candidate.username;
}

export function groupBubbleCandidates(args: { candidates: BubbleGroupCandidate[]; focusUsername?: string | null }): BubbleGroup[] {
  const focusUsername = args.focusUsername ?? null;

  const groupMembers = new Map<string, Set<string>>();
  for (const candidate of args.candidates) {
    const id = groupIdFor(candidate);
    const set = groupMembers.get(id) ?? new Set<string>();
    set.add(candidate.username);
    groupMembers.set(id, set);
  }

  const groups: BubbleGroup[] = [];
  for (const [id, membersSet] of groupMembers.entries()) {
    const members = Array.from(membersSet).sort((a, b) => a.localeCompare(b));
    const sortKey = members[0] ?? id;
    const representative = focusUsername && members.includes(focusUsername) ? focusUsername : sortKey;
    groups.push({ id, sortKey, members, representative });
  }

  groups.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return groups;
}

export function selectBubbleGroups(args: { groups: BubbleGroup[]; bubbleLimit: number; focusUsername?: string | null }): BubbleGroup[] {
  if (args.bubbleLimit <= 0) return [];

  const focusUsername = args.focusUsername ?? null;
  const focusedGroup = focusUsername ? args.groups.find((group) => group.members.includes(focusUsername)) ?? null : null;

  const selected: BubbleGroup[] = [];
  if (focusedGroup) selected.push(focusedGroup);

  for (const group of args.groups) {
    if (selected.length >= args.bubbleLimit) break;
    if (focusedGroup && group.id === focusedGroup.id) continue;
    selected.push(group);
  }

  return selected;
}
