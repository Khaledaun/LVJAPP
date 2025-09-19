'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

type AppUser = {
  termsAccepted?: boolean;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  // allow other custom fields
  [k: string]: any;
};

type Props = {
  children: React.ReactNode;
};

/**
 * Wraps the app with next-auth's SessionProvider and a client-only AuthGate
 * that performs redirects based on authenticated user state.
 * - Safe for SSR/build: no access to session.user without narrowing
 * - No redirects during build/prerender
 */
export default function AuthProvider({ children }: Props) {
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === '1') return <>{children}</>;
  return (<SessionProvider refetchOnWindowFocus={false}>
      <AuthGate>{children}</AuthGate>
    </SessionProvider>
  );
}

function AuthGate({ children }: Props) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === '1';

  useEffect(() => {
    if (skipAuth) return;
    if (status !== 'authenticated') return;

    const user = (session?.user as any) || {};
    const accepted = Boolean(user.termsAccepted);
    if (!accepted && pathname !== '/terms/accept') {
      router.push('/terms/accept');
    }
  }, [skipAuth, status, session, pathname, router]);// Never block rendering; pages should show their own loading UI if needed.
  return <>{children}</>;
}
