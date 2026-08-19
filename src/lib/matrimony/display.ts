// How a member's name is shown to other members, per their display_pref.
// Was copy-pasted across the matrimony pages; this is the canonical copy.
export function getDisplayName(fullName: string, pref?: string): string {
  if (!fullName) return 'Member';
  if (pref === 'full_name') return fullName;
  if (pref === 'initials') {
    return fullName.split(' ').map(n => n[0]).join('.').toUpperCase();
  }
  return fullName.split(' ')[0];
}
