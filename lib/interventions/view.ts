export const labels = {
 payload_too_large:["Demande trop volumineuse (8 Ko maximum). Raccourcissez le texte.","Request too large (8 KB maximum). Shorten the text."],
 unsupported_media:["Format de demande non pris en charge.","Unsupported request format."],invalid_json:["Demande illisible. Réessayez.","Invalid request. Try again."],

 account:["Mon compte","My account"], subscriptions:["Abonnements","Subscriptions"], billing:["Facturation","Billing"], interventions:["Interventions","Interventions"],
 loading:["Chargement…","Loading…"], retry:["Réessayer","Retry"], unavailable:["Service indisponible. Réessayez plus tard.","Service unavailable. Please try later."],
 error:["Impossible de charger ces données.","Unable to load this data."], invalid:["Vérifiez les champs saisis.","Check the entered fields."],
 not_found:["Demande introuvable ou inaccessible.","Request not found or inaccessible."], forbidden:["Action non autorisée.","Action not allowed."],
 auth_required:["Connectez-vous pour accéder à votre espace.","Sign in to access your workspace."], rate_limited:["Trop de demandes. Réessayez plus tard.","Too many requests. Try later."],
 invalid_transition:["Cette transition n’est pas autorisée. Actualisez la demande.","This transition is not allowed. Refresh the request."],
 quota_exceeded:["Le temps dépasse le solde de cette période. Aucune imputation effectuée.","Time exceeds this period's remaining allowance. No time was charged."],
 quota_unavailable:["Forfait non disponible ou période non vérifiée. Aucune imputation effectuée.","Allowance unavailable or period unverified. No time was charged."],
 outside_period:["La réalisation doit appartenir à la période contractuelle courante.","Work must belong to the current contractual period."],
 invalid_performed_at:["Date de réalisation invalide.","Invalid work date."], scope_required:["Confirmez le périmètre mineur et le forfait.","Confirm the minor scope and coverage."],
 explanation_required:["Précisez les conditions hors forfait.","Explain the outside-plan conditions."], immutable:["Ce paramètre ne peut pas être modifié.","This parameter cannot be changed."],
 idempotency_conflict:["Une autre opération utilise cet identifiant. Actualisez.","Another operation uses this identifier. Refresh."],
 request_closed:["Cette demande est clôturée.","This request is closed."], saved:["Enregistré.","Saved."],
 firstName:["Prénom","First name"],lastName:["Nom","Last name"],email:["Adresse e-mail","Email"],save:["Enregistrer","Save"],
 projects:["Projets et sites","Projects and sites"],project:["Projet ou site","Project or site"],newProject:["Nom du projet","Project name"],addProject:["Ajouter un projet","Add project"],
 noProjects:["Ajoutez d’abord un projet dans Mon compte.","First add a project in My account."],
 emptySubscriptions:["Aucun abonnement enregistré.","No subscription recorded."],emptyInvoices:["Aucune facture enregistrée.","No invoice recorded."],emptyPayments:["Aucun paiement enregistré.","No payment recorded."],
 month:["mois","month"],year:["an","year"],periodEnd:["Fin de période","Period end"],periodStart:["Début de période","Period start"],cancellation:["Résiliation prévue","Scheduled cancellation"],
 portal:["Factures, paiement et résiliation dans Stripe","Invoices, payment and cancellation in Stripe"],portal_failed:["Portail Stripe indisponible. Votre abonnement n’est pas modifié.","Stripe Portal unavailable. Your subscription is unchanged."],
 portal_unavailable:["Le portail sera accessible après association d’un client Stripe.","The portal becomes available once a Stripe customer is linked."],stripe_unconfigured:["Stripe n’est pas configuré.","Stripe is not configured."],
 active:["Actif","Active"],incomplete:["Paiement en attente","Payment pending"],trialing:["Période d’essai","Trial period"],past_due:["Paiement en échec","Payment failed"],unpaid:["Période impayée","Unpaid period"],
 canceled:["Abonnement terminé","Subscription ended"],incomplete_expired:["Souscription expirée","Subscription expired"],pending:["En attente","Pending"],succeeded:["Réussi","Succeeded"],failed:["Échoué","Failed"],
 paid:["Payée","Paid"],open:["À régler","Due"],draft:["Brouillon","Draft"],void:["Annulée","Voided"],uncollectible:["Impayée","Uncollectible"],scheduled:["Résiliation programmée","Cancellation scheduled"],
 quota:["Temps de modifications mineures","Minor-change allowance"],included:["Inclus","Included"],consumed:["Consommé","Used"],remaining:["Restant","Remaining"],minutes:["minutes","minutes"],
 rules:["60 minutes maximum par mois d’abonnement, sans report ni transfert. Ni nouvelle fonctionnalité, ni refonte. Acceptation après analyse ; le dépôt d’une demande ne consomme rien.","Up to 60 minutes per subscription month, with no rollover or transfer. No new features or redesigns. Acceptance requires review; submission uses no time."],
 outside_plan:["Demande hors forfait, soumise à analyse et devis éventuel.","Outside-plan request, subject to review and a possible quote."],
 inactive:["Forfait suspendu : abonnement non actif.","Allowance suspended: subscription is not active."],contract_review:["Droits en attente de vérification contractuelle.","Allowance pending contract review."],
 unverified_period:["Ancrage ou période d’abonnement à synchroniser.","Subscription anchor or period needs syncing."],unverified_payment:["Période payée non encore vérifiée.","Paid service period is not yet verified."],eligible:["Forfait disponible","Allowance available"],
 timeHistory:["Historique du temps enregistré","Recorded time history"],noTime:["Aucune intervention imputée.","No recorded time."],recent:["100 dernières écritures ; factures complètes dans le portail.","Latest 100 entries; full invoices in the portal."],
 due:["À payer","Due"],received:["Payé","Paid"],balance:["Reste à payer","Outstanding"],payments:["Paiements enregistrés","Recorded payments"],invoices:["Factures","Invoices"],
 newRequest:["Nouvelle demande","New request"],subject:["Objet","Subject"],description:["Description détaillée","Detailed description"],category:["Catégorie","Category"],urgency:["Urgence déclarée","Declared urgency"],additional:["Informations complémentaires","Additional information"],
 notice:["Chaque demande est analysée. L’urgence déclarée ne garantit pas une priorité. Aucun supplément n’est facturé automatiquement.","Every request is reviewed. Declared urgency does not guarantee priority. No additional charge is automatic."],
 subscription:["Abonnement concerné","Related subscription"],none:["Hors forfait / sans abonnement","Outside plan / no subscription"],submit:["Soumettre la demande","Submit request"],emptyRequests:["Aucune demande.","No requests."],
 detail:["Ouvrir le suivi","Open thread"],back:["Fermer le suivi","Close thread"],previous:["Précédent","Previous"],next:["Suivant","Next"],
 submitted:["Soumise","Submitted"],analyzing:["En cours d’analyse","Under review"],accepted:["Acceptée","Accepted"],in_progress:["En cours","In progress"],waiting_client:["En attente du client","Waiting for customer"],completed:["Terminée","Completed"],rejected:["Refusée","Rejected"],cancelled:["Annulée","Cancelled"],
 minor_fix:["Correction mineure","Minor fix"],content:["Modification de contenu","Content change"],visual:["Ajustement visuel","Visual adjustment"],maintenance:["Maintenance","Maintenance"],incident:["Incident technique","Technical incident"],other:["Autre demande","Other"],
 low:["Faible","Low"],normal:["Normale","Normal"],high:["Élevée, sans priorité garantie","High, without guaranteed priority"],
 client:["Client","Customer"],admin:["Nomad403","Nomad403"],message:["Message","Message"],internal:["Note interne, invisible au client","Internal note, hidden from customer"],send:["Envoyer dans le suivi","Post to thread"],
 emailNotice:["Le suivi est enregistré ici. Les notifications e-mail ne sont pas activées.","Updates are recorded here. Email notifications are not enabled."],
 status:["Statut","Status"],change:["Changer le statut","Change status"],coverage:["Prise en charge","Coverage"],unreviewed:["À analyser","Awaiting review"],outside:["Hors forfait — validation et devis éventuel","Outside plan — review and possible quote"],
 minorConfirm:["Je confirme une modification mineure et le rattachement du contrat à ce site, sans nouvelle fonctionnalité ni refonte.","I confirm minor changes and the contract assignment to this site, with no new features or redesign."],
 complete:["Terminer et enregistrer le temps réel","Complete and record actual time"],actualMinutes:["Temps réellement consommé (minutes)","Actual time used (minutes)"],performed:["Date de réalisation (période courante)","Work date (current period)"],
 cancelRequest:["Annuler la demande","Cancel request"],note:["Commentaire","Comment"],refresh:["Actualiser","Refresh"],
} as const
export function translate(key: string, language: string): string {
 const value = labels[key as keyof typeof labels]
 return value ? value[language === "en" ? 1 : 0] : key
}
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
 const response = await fetch(url,{cache:"no-store",...options})
 const value = await response.json().catch(()=>null)
 if (!response.ok || !value) throw new Error(value?.code ?? (response.status===401 ? "auth_required" : "unavailable"))
 return value as T
}
export type ClientQuota = {reason:string;included:number;consumed:number;remaining:number;start:string|null;end:string|null}
export type ClientSubscription = {
 id:string;projectId:string|null;planCode:string;status:string;amountCents:number;currency:string;billingInterval:string;
 currentPeriodStart:string|null;currentPeriodEnd:string|null;cancelRequestedAt:string|null;cancelEffectiveAt:string|null;commercialTerms:string;
 quota:ClientQuota;timeEntries:{id:string;requestId:string;minutes:number;coverage:string;performedAt:string;periodStart:string|null;periodEnd:string|null}[]
}
export type Dashboard = {
 profile:{firstName:string|null;lastName:string|null;email:string};projects:{id:string;name:string}[];subscriptions:ClientSubscription[];
 invoices:{id:string;status:string;amountDueCents:number;amountPaidCents:number;amountRemainingCents:number;issuedAt:string|null}[];
 payments:{id:string;status:string;amountCents:number;paidAt:string|null}[]
}
export type RequestView = {
 id:string;userId:string;projectId:string;projectName:string;clientEmail?:string;subscriptionId:string|null;subject:string;description:string;category:string;urgency:string;
 additionalInfo:string;status:string;coverage:string;createdAt:string;updatedAt:string;
}
export type RequestDetail = RequestView & {
 events:{id:string;actorId:string;actorRole:string;kind:string;body:string;internal:boolean;fromStatus:string|null;toStatus:string|null;createdAt:string}[];
 time:{minutes:number;coverage:string;performedAt:string}|null;offset:number;hasMore:boolean;
 contract:{planCode:string;amountCents:number;billingInterval:string;quota:ClientQuota}|null;
}
