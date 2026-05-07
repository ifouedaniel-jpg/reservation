import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mentions légales' };

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Salon de [Nom]';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Mentions légales</h1>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Éditeur du site</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong className="text-foreground">{businessName}</strong></p>
          <p>Activité : prestataire de services à la personne (coiffure)</p>
          <p>Statut : auto-entrepreneur / micro-entreprise</p>
          <p>Adresse : <em>[à compléter]</em></p>
          <p>SIRET : <em>[à compléter]</em></p>
          <p>Contact : <em>[email à compléter]</em></p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Hébergement</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Ce site est hébergé par :</p>
          <p><em>[Nom de l&apos;hébergeur à compléter]</em></p>
          <p><em>[Adresse de l&apos;hébergeur à compléter]</em></p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Propriété intellectuelle</h2>
        <p className="text-sm text-muted-foreground">
          L&apos;ensemble des contenus présents sur le site{' '}
          <span className="font-mono text-xs">{siteUrl}</span> (textes, images,
          logos) sont la propriété exclusive de {businessName} et sont protégés
          par la législation française sur la propriété intellectuelle. Toute
          reproduction est interdite sans autorisation préalable.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Données personnelles</h2>
        <p className="text-sm text-muted-foreground">
          Les informations relatives au traitement des données personnelles sont
          disponibles dans notre{' '}
          <a href="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Cookies</h2>
        <p className="text-sm text-muted-foreground">
          Ce site n&apos;utilise pas de cookies publicitaires ou de traçage tiers.
          Un cookie de session est utilisé uniquement pour l&apos;espace
          d&apos;administration.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Responsabilité</h2>
        <p className="text-sm text-muted-foreground">
          {businessName} s&apos;efforce de maintenir les informations publiées
          à jour. Toutefois, le site peut être modifié sans préavis et
          {' '}{businessName} ne peut être tenu responsable des erreurs ou
          omissions éventuelles.
        </p>
      </section>
    </div>
  );
}
