import { LoginForm } from './LoginForm';
import { loginAction } from './actions';

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  return <LoginForm action={loginAction} callbackUrl={callbackUrl} />;
}
