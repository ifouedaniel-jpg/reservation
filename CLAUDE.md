# CLAUDE.md — Salon Booking

Application web de réservation en ligne pour prestataires de services à la
personne (cas de référence : coiffeuse indépendante). Site public + back-office
admin dans la même app Next.js.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS v4** + **shadcn/ui** (composants copiés dans `src/components/ui`)
- **Prisma** + **SQLite (mode WAL)** — contrainte VPS 1 Go RAM
- **Auth.js v5** (Credentials provider, admin uniquement)
- **Resend** + **React Email** (emails transactionnels)
- **Cloudinary** (images de prestations)
- **Zod** (validation partagée)
- **date-fns** + **date-fns-tz** (jamais l'API `Date` native pour les TZ)
- **Vitest** (tests)
- **npm** (package manager)

---

## Commandes utiles

```bash
# Dev
npm run dev                 # serveur Next.js sur :3000
npm run db:studio           # Prisma Studio (UI BDD)

# DB
npm run db:migrate          # prisma migrate dev (à lancer après chaque modif du schema)
npm run db:generate         # prisma generate
npm run db:seed             # données de démo
npm run db:reset            # reset complet (DEV UNIQUEMENT)

# Quality
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm test                    # Vitest run
npm run test:watch          # Vitest watch
npm run format              # Prettier

# Build / prod
npm run build
npm start
```

**À la fin de chaque ticket** : lancer `npm run typecheck && npm run lint && npm test`.

---

## Conventions de code

- **TypeScript strict**, pas de `any`. Utiliser `unknown` + Zod si type incertain.
- **Server Actions** pour toutes les mutations (création/validation/annulation
  de réservation, gestion des prestations). Les Route Handlers (`app/api/`)
  sont réservés aux endpoints publics consommés en JS côté client (ex: liste
  des créneaux libres) et aux webhooks externes.
- **Validation Zod systématique** à la frontière serveur. Schémas dans
  `src/schemas/`, réutilisés côté client pour les formulaires (avec
  `react-hook-form` + `@hookform/resolvers/zod` quand pertinent).
- **Toujours utiliser des centimes** (`Int`) pour les prix. Jamais de float.
- **Toujours stocker les dates en UTC**, afficher en `Europe/Paris` via
  les helpers de `src/lib/time.ts`.
- Composants : un fichier par composant, PascalCase. Pas de "barrel files".
- Imports : alias `@/` pour `src/`.
- **Pas de fetch direct vers la BDD depuis un Client Component.** Toujours
  passer par un Server Component ou une Server Action.
- Les Server Components sont le défaut. N'ajouter `"use client"` que si le
  composant a besoin de hooks (`useState`, `useEffect`, etc.) ou d'event
  handlers.

---

## Règles métier critiques

### Réservation et anti-double-booking

La création d'une réservation **doit** :
1. Ouvrir une transaction Prisma avec `isolationLevel: 'Serializable'`.
2. Lire le `TimeSlot` ciblé dans la transaction.
3. Vérifier que `slot.status === 'OPEN'`.
4. Passer le slot à `'PENDING'` et créer le `Booking` lié dans la même
   transaction.
5. Si conflit (status déjà différent de `'OPEN'`) → throw une erreur typée
   (ex: `BookingError.SLOT_NOT_AVAILABLE`).

→ Helper centralisé : `src/lib/booking.ts::createBooking()`. **Ne jamais**
réimplémenter cette logique ailleurs.

SQLite + WAL + transaction Serializable garantit la sérialisation des
écritures. Si une transaction concurrente tente d'écrire en même temps,
elle attendra (jusqu'à `busy_timeout = 5000ms`) puis réessaiera, ou
échouera proprement.

### Statuts de réservation

```
PENDING ──admin valide──▶ CONFIRMED ──jour J──▶ COMPLETED
   │                          │
   ├──admin refuse────────▶ REJECTED
   └──admin/cliente annule─▶ CANCELLED
                              │
                              └─cliente absente──▶ NO_SHOW
```

Quand un booking passe en `CONFIRMED` → le slot reste `BOOKED`.
Quand un booking passe en `REJECTED` ou `CANCELLED` → le slot **doit**
repasser en `OPEN` (sauf s'il était `CLOSED` à l'origine, auquel cas
il reste `CLOSED`).

Toutes les transitions de statut passent par les helpers de
`src/lib/booking.ts`. Pas de `prisma.booking.update({ status: ... })`
directement dans une page ou un composant.

### Notifications

Une notification est **toujours** loggée dans `NotificationLog`, même si
elle a échoué ou nécessite une action manuelle (cas WhatsApp/Instagram).

| Canal | Implémentation | Status loggué |
|---|---|---|
| Email | Resend, asynchrone | `SENT` ou `FAILED` |
| WhatsApp | Lien `wa.me` pré-rempli côté admin | `MANUAL_REQUIRED` (puis `SENT` quand l'admin clique "Envoyé") |
| Instagram | Lien `ig.me/m/{username}` + message à copier | `MANUAL_REQUIRED` |
| SMS | Brevo (feature flag, désactivé en MVP) | `SENT` ou `FAILED` |

Le dispatcher central est `src/notifications/send.ts`. Il prend en entrée
un `Booking` + un `NotificationType` et choisit le canal selon
`booking.preferredChannel`.

### Fuseaux horaires

- Toute date stockée en BDD est en **UTC**.
- L'admin et les clientes voient toujours **Europe/Paris**.
- Quand on génère des créneaux à partir de `RecurringAvailability` (ex:
  "tous les samedis 9h-18h"), on construit les Date en heure de Paris puis
  on les convertit en UTC avec `fromZonedTime` de `date-fns-tz`.
- Attention au passage à l'heure d'été/hiver : `date-fns-tz` gère ça
  nativement.

Helpers centralisés dans `src/lib/time.ts` :
- `parisToUtc(date: Date | string): Date`
- `utcToParis(date: Date): Date`
- `formatParis(date: Date, pattern: string): string`

### Sécurité

- Routes `/admin/**` protégées par `src/middleware.ts` (vérifie session
  NextAuth).
- Côté Server Action admin, vérifier la session avec `requireAdmin()`
  dans `src/lib/auth.ts`. Throw une erreur si pas de session.
- Pas de PII dans les logs applicatifs (ni téléphone, ni email).
- Hash bcrypt avec cost ≥ 12.
- HTTPS obligatoire en prod (Let's Encrypt sur Apache).

### RGPD

- Mention CNIL sur le formulaire de réservation : conservation 3 ans
  après le dernier RDV, droit d'accès/suppression.
- Pages mentions légales + politique de confidentialité.
- Action admin "Supprimer cliente" qui anonymise les bookings (remplace
  les champs personnels par `[supprimé]`) plutôt que de supprimer en
  cascade — pour garder l'historique de CA.

---

## Gotchas

### Prisma
- **Version installée : Prisma 7.** L'API a changé par rapport à la v5/v6 :
  - Le `PrismaClient` **exige obligatoirement** un driver adapter (pas de mode
    sans adapter). Pour SQLite : `new PrismaBetterSqlite3({ url: chemin })`.
  - Pas de `datasourceUrl` dans le constructeur : la config runtime passe
    par l'adapter, la config migrations passe par `prisma.config.ts`.
  - Le client généré est dans `src/generated/prisma/client` (output custom
    dans `prisma/schema.prisma`).
- En dev, le hot reload peut créer plusieurs PrismaClient → **toujours**
  utiliser le pattern singleton de `src/lib/db.ts`.
- Après chaque modif du schema : `npm run db:migrate` (jamais `db push` en prod).
- SQLite ne supporte pas les enums Prisma : on utilise des `String` et on
  valide les valeurs avec Zod côté applicatif.
- L'URL `DATABASE_URL` est au format `file:./dev.db` (pour les migrations).
  Le helper `dbPath()` dans `src/lib/db.ts` strip le préfixe `file:` pour
  passer le chemin brut à `PrismaBetterSqlite3`.

### SQLite
- Mode WAL **obligatoire** : appeler `applySqlitePragmas()` au démarrage
  (déjà fait dans `src/lib/db.ts`, vérifier que c'est appelé une fois
  côté serveur).
- En prod, le fichier `prod.db` doit être writable par l'utilisateur Node.
- Sauvegarde : copier `prod.db` + `prod.db-wal` + `prod.db-shm` (ou
  utiliser `sqlite3 prod.db ".backup backup.db"`).

### Next.js
- **Version installée : Next.js 16.** La commande `next lint` n'existe plus.
  Le script `lint` utilise `eslint .` directement.
- Server Actions → après chaque mutation, appeler `revalidatePath('/...')`
  ou `revalidateTag(...)` pour invalider le cache.
- Les Server Actions doivent retourner un objet `{ ok: true, data }` ou
  `{ ok: false, error }` plutôt que de throw, pour que le client puisse
  les afficher proprement.
- Pas de logique côté client qui fait confiance à un timestamp envoyé
  par le navigateur (ex: "ce créneau est-il dans le futur ?"). Toujours
  recalculer côté serveur.

### shadcn/ui
- Composants copiés dans `src/components/ui/`, pas installés via npm.
- Pour ajouter un composant : `npx shadcn@latest add button`.
- Si tu modifies un composant ui, documente pourquoi en commentaire en
  haut du fichier.

### Cloudinary
- Uploads **uniquement côté serveur** (Server Action), jamais exposer
  `CLOUDINARY_API_SECRET` au client.
- Utiliser `unsigned upload preset` si on veut un jour faire de l'upload
  direct depuis le client, mais ce n'est pas le cas pour le MVP.

### Resend
- En dev, utiliser `onboarding@resend.dev` comme expéditeur.
- En prod, vérifier le domaine d'envoi avant le lancement.
- Quota free : 3000 emails/mois, **100/jour**. Largement suffisant.

---

## Ce qu'il NE faut PAS faire

- **Ne pas** ajouter de framework de state management global (Redux,
  Zustand, Jotai). `useState` + Server Actions suffisent.
- **Ne pas** introduire de microservices. Tout reste dans le monorepo
  Next.js.
- **Ne pas** migrer vers PostgreSQL sans validation explicite. La RAM
  du VPS (1 Go) impose SQLite.
- **Ne pas** implémenter de paiement en ligne dans le MVP. L'architecture
  prévoit `priceCentsAtBooking` mais le paiement reste sur place.
- **Ne pas** désactiver TypeScript strict ou ESLint pour faire passer
  un build.
- **Ne pas** faire de "refactor opportuniste" pendant un ticket
  fonctionnel. Si tu vois un truc à refactor, ouvre une note dans
  `NOTES.md` et continue le ticket en cours.

---

## Données de démo

`npm run db:seed` crée :
- 1 admin (email/password dans `.env`, valeurs par défaut dans `.env.example`)
- 6 prestations type coiffeuse (tresses, tissage, lissage, coloration,
  box braids, soin)
- 1 règle de disponibilité récurrente par jour ouvré (mardi-samedi 9h-19h,
  créneaux de 30 min)

Pour générer les `TimeSlot` à partir des règles récurrentes, voir le
ticket T1.4 (helper `regenerateSlots(weeksAhead: number)`).

---

## Workflow de développement

1. Je te donne un ticket.
2. Tu lis le ticket et `CLAUDE.md`. Si quelque chose est ambigu, tu me
   demandes avant de coder.
3. Tu codes uniquement le périmètre du ticket.
4. Tu lances `npm run typecheck && npm run lint && npm test`.
5. Tu me proposes un message de commit.
6. Je review, je merge, ticket suivant.

---

## Numérotation des tickets

- T0.x = bootstrap
- T1.x = MVP (réservation fonctionnelle bout en bout)
- T2.x = anti-no-show + autonomie cliente
- T3.x = robustesse + paiement optionnel

---

_Dernière mise à jour : à maintenir par Claude Code à chaque ajout de
convention ou gotcha._
