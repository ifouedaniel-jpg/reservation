import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de confidentialité' };

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Salon de [Nom]';

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground">
        Conformément au Règlement Général sur la Protection des Données (RGPD)
        et à la loi Informatique et Libertés, {businessName} vous informe de
        la manière dont vos données personnelles sont collectées et traitées.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Responsable du traitement</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong className="text-foreground">{businessName}</strong></p>
          <p>Contact : <em>[email à compléter]</em></p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Données collectées</h2>
        <p className="text-sm text-muted-foreground">
          Lors d&apos;une demande de réservation, nous collectons :
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
          <li>Prénom et nom</li>
          <li>Numéro de téléphone</li>
          <li>Adresse email (optionnelle)</li>
          <li>Identifiant Instagram (optionnel)</li>
          <li>Notes libres liées à la prestation (optionnelles)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Finalités du traitement</h2>
        <p className="text-sm text-muted-foreground">
          Vos données sont utilisées exclusivement pour :
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
          <li>La gestion de votre réservation</li>
          <li>Vous contacter pour confirmer, modifier ou annuler votre rendez-vous</li>
          <li>L&apos;envoi de rappels et confirmations</li>
          <li>La tenue de la comptabilité (montants, dates)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Base légale</h2>
        <p className="text-sm text-muted-foreground">
          Le traitement est fondé sur l&apos;exécution d&apos;un contrat (prestation
          de service) ainsi que sur votre consentement explicite recueilli lors
          de la réservation.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Durée de conservation</h2>
        <p className="text-sm text-muted-foreground">
          Vos données personnelles sont conservées <strong>3 ans</strong> à
          compter de votre dernier rendez-vous, conformément aux recommandations
          de la CNIL. À l&apos;issue de ce délai, elles sont anonymisées.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Destinataires des données</h2>
        <p className="text-sm text-muted-foreground">
          Vos données sont accessibles uniquement par {businessName}. Elles ne
          sont transmises à aucun tiers à des fins commerciales. Les services
          tiers utilisés (Resend pour les emails) traitent vos données en
          qualité de sous-traitant et selon leurs propres politiques conformes
          au RGPD.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Vos droits</h2>
        <p className="text-sm text-muted-foreground">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
          <li><strong className="text-foreground">Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
          <li><strong className="text-foreground">Droit de rectification</strong> : corriger des données inexactes</li>
          <li><strong className="text-foreground">Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
          <li><strong className="text-foreground">Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
          <li><strong className="text-foreground">Droit d&apos;opposition</strong> : vous opposer à certains traitements</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          Pour exercer ces droits, contactez-nous à{' '}
          <em>[email à compléter]</em>. En cas de litige, vous pouvez saisir
          la{' '}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            CNIL
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Sécurité</h2>
        <p className="text-sm text-muted-foreground">
          Nous mettons en œuvre des mesures techniques et organisationnelles
          appropriées pour protéger vos données contre tout accès non autorisé,
          perte ou destruction (chiffrement, accès restreint, HTTPS).
        </p>
      </section>

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Dernière mise à jour : mai 2026
      </p>
    </div>
  );
}
