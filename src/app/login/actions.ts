'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';
import { loginSchema } from '@/schemas/auth';

export type LoginState = { ok: false; error: string } | { ok: true } | null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Identifiant ou mot de passe invalide.' };
  }

  const callbackUrl = (formData.get('callbackUrl') as string) || '/admin';
  const safeRedirect = callbackUrl.startsWith('/') ? callbackUrl : '/admin';

  try {
    await signIn('credentials', {
      username: parsed.data.username,
      password: parsed.data.password,
      redirectTo: safeRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
    }
    throw error;
  }

  return { ok: true };
}
