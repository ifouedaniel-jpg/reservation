import NextAuth, { type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './db';
import { loginSchema } from '@/schemas/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id ?? token.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.email) session.user.email = token.email;
      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        return findAndVerifyAdmin(parsed.data.username, parsed.data.password);
      },
    }),
  ],
});

export async function findAndVerifyAdmin(username: string, password: string) {
  const admin = await prisma.admin.findFirst({
    where: { OR: [{ email: username }, { name: username }] },
  });
  if (!admin) return null;
  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  return session as Session;
}
