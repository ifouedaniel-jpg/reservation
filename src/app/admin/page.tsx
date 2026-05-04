import { requireAdmin } from '@/lib/auth';

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold">Bienvenue, {session.user.email}</h1>
    </div>
  );
}
