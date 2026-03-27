// import { Role } from "@prisma/client"; // Commented out due to Prisma client generation issue
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log("\n--- AUTHORIZE ATTEMPT ---");
        console.log("Attempting login for email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Email or password missing in credentials object.");
          return null;
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (user) {
            console.log("✅ User found in database:", user.email, "Role:", user.role);
            if (user.password === credentials.password) {
              console.log("✅ Password MATCHES. Login successful.");
              return user;
            } else {
              console.log("❌ Password DOES NOT MATCH.");
              console.log("   - DB password:", user.password);
              console.log("   - Provided password:", credentials.password);
              return null;
            }
          } else {
            console.log("❌ User NOT found in database.");
            return null;
          }
        } catch (error) {
          console.error("🔥 DATABASE ERROR during authorization:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
}
