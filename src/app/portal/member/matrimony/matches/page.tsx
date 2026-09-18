import { redirect } from 'next/navigation';

/** Matches is an order in Browse now: everyone you can see, best fit first. */
export default function Page() {
  redirect('/portal/member/matrimony/browse?sort=best_match');
}
