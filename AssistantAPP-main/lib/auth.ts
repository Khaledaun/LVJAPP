import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import { Role } from "@prisma/client";

// The fix is to use a NAMED import for the prisma client instance
import { prisma } from "@/lib/db";

// Make sure to import your providers, e.g.,
// import CredentialsProvider from "next-auth/providers/credentials";

export const getAuthOptions = (): AuthOptions => ({
  // The PrismaAdapter now receives the direct client instance
  adapter: PrismaAdapter(prisma),
  
  // ==> IMPORTANT: Add your existing authentication providers here <==
  providers: [
    /*
     * Example:
     * CredentialsProvider({ ...your provider config... })
    */
  ],

  session: {
    strategy: "jwt",
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
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  
  // ==> Add any other existing options like 'pages' or 'secret' here <==
});
