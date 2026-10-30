import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, StopCircle, Timer } from 'lucide-react';
import type { BluetoothManager } from '../services/bluetooth/BluetoothManager';
import { abortPour, pour } from '../services/bluetooth/BLECommands';
import { getIngredient } from '../data/ingredients';
import type { DrinkDose, PourPlan, PumpConfig } from '../types/bar';
import { Card } from '../components/Card';
import { cn } from '../utils/format';

interface PourPageProps {
  manager: BluetoothManager;
  plan: PourPlan;
  doses: DrinkDose[];
  pumpsUsed: PumpConfig[];
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
  onDone: () => void;
}

type PourState = 'starting' | 'pouring' | 'done' | 'aborted' | 'failed';

/** Screen — live synchronized pour with per-pump progress and abort. */
export function PourPage({ manager, plan, doses, pumpsUsed, notify, onDone }: PourPageProps) {
  const [phase, setPhase] = useState<PourState>('starting');
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const failedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const startTimer = () => {
      startedAtRef.current = Date.now();
      setPhase('pouring');
      tickRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 100);
    };

    manager
      .sendCommand(pour(plan.pumps.map((p) => ({ pumpNo: p.pumpNo, ms: p.ms }))))
      .then(() => {
        if (!cancelled) startTimer();
        notify('success', `Pouring ${plan.drinkName}…`);
      })
      .catch(() => {
        failedRef.current = true;
        if (!cancelled) {
          setPhase('failed');
          notify('error', 'The machine rejected the pour command.');
        }
      });

    return () => {
      cancelled = true;
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Natural completion.
  useEffect(() => {
    if (phase === 'pouring' && elapsed >= plan.totalMs) {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      setPhase('done');
    }
  }, [phase, elapsed, plan.totalMs]);

  const abort = async () => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    try {
      await manager.sendCommand(abortPour());
      notify('info', 'Pour aborted — all pumps stopped.');
    } catch {
      notify('error', 'Abort command failed — check the machine.');
    } finally {
      setElapsed(plan.totalMs); // freeze
      setPhase('aborted');
    }
  };

  const progress = phase === 'done' || phase === 'aborted' ? (phase === 'aborted' ? Math.min(1, elapsed / plan.totalMs) : 1) : Math.min(1, elapsed / plan.totalMs);
  const remaining = Math.max(0, plan.totalMs - elapsed);

  void doses;
  void pumpsUsed;

  return (
    <div className="animate-rise space-y-4">
      <Card className="!p-6">
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'relative flex h-52 w-52 items-center justify-center rounded-full transition-colors duration-500',
              phase === 'pouring' && 'animate-pulse-ring',
            )}
            style={{
              background: `conic-gradient(#38bdf8 ${progress * 360}deg, var(--surface-2) ${progress * 360}deg)`,
            }}
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-surface">
              {phase === 'done' ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              ) : (
                <>
                  <Timer className={cn('mb-2 h-7 w-7 text-sky-300', phase === 'pouring' && 'animate-pulse')} />
                  <span className="font-mono text-4xl font-black text-text">
                    {Math.ceil(remaining / 1000)}
                    <span className="text-2xl text-text-muted">s</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="font-display mt-5 text-center text-[22px] font-semibold text-text">{plan.drinkName}</p>
          <p
            className={cn(
              'mt-1 text-[13px] font-bold uppercase tracking-widest',
              phase === 'pouring' && 'text-cyan-300',
              phase === 'done' && 'text-emerald-300',
              phase === 'aborted' && 'text-amber-300',
              (phase === 'starting' || phase === 'failed') && 'text-text-muted',
            )}
            aria-live="polite"
          >
            {phase === 'starting' && 'Launching valves…'}
            {phase === 'pouring' && 'Pouring…'}
            {phase === 'done' && 'Enjoy responsibly 🍹'}
            {phase === 'aborted' && 'Pour aborted'}
            {phase === 'failed' && 'Pour failed'}
          </p>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-[11px] font-bold tracking-widest text-text-muted uppercase">Active pumps</p>
        <div className="space-y-3">
          {plan.pumps.map((p) => {
            const pProgress = Math.min(1, Math.max(0, elapsed / p.ms));
            const ing = getIngredient(p.ingredientId);
            return (
              <div key={p.pumpNo}>
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ing.colour }} />
                    {ing.name} · Pump {p.pumpNo}
                  </span>
                  <span className={cn('font-mono text-[12px]', elapsed >= p.ms ? 'text-emerald-300' : 'text-text-muted')}>
                    {elapsed >= p.ms ? 'DONE' : `${p.ml} ml`}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{ width: `${pProgress * 100}%`, backgroundColor: '#38bdf8' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {phase === 'pouring' && (
        <button
          type="button"
          onClick={() => void abort()}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-b from-rose-400 to-rose-600 text-lg font-black text-white shadow-xl shadow-rose-500/30 transition active:scale-[0.97]"
        >
          <StopCircle className="h-7 w-7" strokeWidth={2.4} />
          STOP POUR
        </button>
      )}

      {(phase === 'done' || phase === 'aborted' || phase === 'failed') && (
        <button
          type="button"
          onClick={onDone}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-surface text-[15px] font-bold text-text transition active:scale-[0.97]"
        >
          Back to the menu
        </button>
      )}
    </div>
  );
}
