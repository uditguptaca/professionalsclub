import 'server-only';

/**
 * An error whose message is written FOR the member and may be shown verbatim.
 *
 * The action layer masks anything it does not recognise, because a raw runtime
 * fault names internals. It used to recognise safe messages by a "Please keep
 * it" prefix, which meant the prefix ended up glued to sixteen unrelated
 * validation errors ("Please keep it - unknown action."). A type says the same
 * thing without putting a word on the member's screen.
 */
export class MemberFacingError extends Error {
  readonly memberFacing = true;
  constructor(message: string) {
    super(message);
    this.name = 'MemberFacingError';
  }
}

/** True when the message was written for a member rather than for a log. */
export function isMemberFacing(error: unknown): error is Error {
  return error instanceof MemberFacingError
    || (error instanceof Error && (error as { memberFacing?: boolean }).memberFacing === true);
}
