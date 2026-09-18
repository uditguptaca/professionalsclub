import { redirect } from 'next/navigation';

/** The shortlist is a lane of Likes; one place for everything you are weighing up. */
export default function Page() {
  redirect('/portal/member/matrimony/interests?lane=shortlist');
}
