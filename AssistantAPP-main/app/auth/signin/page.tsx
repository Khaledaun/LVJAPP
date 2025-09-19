import { redirect } from 'next/navigation';

export default function SignInPage() {
  // In mock mode, just go to Cases and skip auth UI
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === '1') {
    redirect('/cases');
  }
  // Otherwise, send to NextAuth's built-in page
  redirect('/api/auth/signin');
}
