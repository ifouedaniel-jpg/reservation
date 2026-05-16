import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const mockAuth = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
);

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    admin: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn().mockReturnValue({ type: 'credentials', id: 'credentials' }),
}));

vi.mock('next-auth', () => ({
  default: vi.fn().mockImplementation(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: mockAuth,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

import { requireAdmin, findAndVerifyAdmin } from '@/lib/auth';

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('redirects to /login when session is null', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: null, expires: '' });
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('returns session when authenticated', async () => {
    const session = { user: { id: '1', name: 'Admin' }, expires: '' };
    mockAuth.mockResolvedValue(session);
    const result = await requireAdmin();
    expect(result.user.id).toBe('1');
  });
});

describe('findAndVerifyAdmin (authorize callback logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when admin not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await findAndVerifyAdmin('unknown', 'password');
    expect(result).toBeNull();
  });

  it('returns null for wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 12);
    mockFindUnique.mockResolvedValue({
      id: '1',
      passwordHash,
      name: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await findAndVerifyAdmin('Admin', 'wrongpassword');
    expect(result).toBeNull();
  });

  it('returns user data for correct credentials', async () => {
    const passwordHash = await bcrypt.hash('secret123', 12);
    mockFindUnique.mockResolvedValue({
      id: 'admin-id-1',
      passwordHash,
      name: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await findAndVerifyAdmin('Admin', 'secret123');
    expect(result).toEqual({ id: 'admin-id-1', name: 'Admin' });
  });
});
