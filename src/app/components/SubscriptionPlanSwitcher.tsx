import { ShieldCheck, UserRound } from 'lucide-react';
import { subscriptionPlans, type SubscriptionPlan } from '../data/subscriptionAccess';

interface SubscriptionPlanSwitcherProps {
  currentPlan: SubscriptionPlan;
  onChange: (plan: SubscriptionPlan) => void;
}

export function SubscriptionPlanSwitcher({ currentPlan, onChange }: SubscriptionPlanSwitcherProps) {
  const active = subscriptionPlans.find((plan) => plan.id === currentPlan) ?? subscriptionPlans[0];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary">LAZA-044 access simulation</p>
            <h2 className="mt-1 text-xl tracking-tight">Subscription view: {active.label}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{active.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {subscriptionPlans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              onClick={() => onChange(plan.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                currentPlan === plan.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <UserRound className="h-4 w-4" />
              {plan.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
        Test persona: <span className="font-mono text-foreground">{active.testUsername}</span>. This MVP selector simulates commercial access; payment, expiry and identity-provider enforcement remain future implementation work.
      </div>
    </section>
  );
}
