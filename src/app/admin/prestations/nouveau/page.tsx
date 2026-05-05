import { createService } from '@/server/actions/service';
import { ServiceForm } from '@/components/admin/ServiceForm';

export default function NouvellePrestationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle prestation</h1>
      <ServiceForm action={createService} />
    </div>
  );
}
