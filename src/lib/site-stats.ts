/**
 * Canonical community figures for the public pages.
 *
 * The homepage, the donate page and the WhatsApp panels each used to carry
 * their own numbers, and they disagreed (5,000+ vs 6,000+ participants, six
 * communities vs "50+ groups"). Quote these instead of typing a figure inline.
 *
 * `whatsappParticipants` is the total across the six communities listed on the
 * homepage and /groups; `members` is registered community members.
 */
export const SITE_STATS = {
  members: '5,000+',
  volunteers: '18',
  whatsappParticipants: '6,000+',
  whatsappCommunities: '6',
} as const;
