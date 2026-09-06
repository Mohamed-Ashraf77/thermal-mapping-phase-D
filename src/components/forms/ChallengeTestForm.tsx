import { Plus, Trash2 } from 'lucide-react';
import { useReport } from '../../store/ReportContext';
import { SectionCard } from '../ui/SectionCard';
import { createId } from '../../utils/id';
import type { ChallengeTestMeta } from '../../types/report';

const cellInput =
  'w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100';

const TYPE_LABELS: Record<ChallengeTestMeta['type'], string> = {
  powerFailure: 'Power Failure',
  openDoor: 'Open Door',
};

export function ChallengeTestForm() {
  const { report, update } = useReport();
  if (!report) return null;
  const tests = report.challengeTests;

  function patch(id: string, changes: Partial<ChallengeTestMeta>) {
    update((r) => {
      const t = r.challengeTests.find((ct) => ct.id === id);
      if (t) Object.assign(t, changes);
    });
  }

  function addTest(type: ChallengeTestMeta['type']) {
    update((r) => {
      r.challengeTests.push({
        id: createId('challenge'),
        type,
        date: '',
        startTime: '',
        endTime: '',
        plannedDurationMinutes: type === 'powerFailure' ? 30 : 5,
      });
    });
  }

  function removeTest(id: string) {
    update((r) => {
      r.challengeTests = r.challengeTests.filter((ct) => ct.id !== id);
    });
  }

  return (
    <SectionCard
      title="Challenge Tests"
      description="Sets the exact date/time window used to compute out-of-spec, excursion duration, and recovery time for Section 14, per datalogger."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addTest('powerFailure')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Plus className="h-3.5 w-3.5" /> Power failure
          </button>
          <button
            type="button"
            onClick={() => addTest('openDoor')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Plus className="h-3.5 w-3.5" /> Open door
          </button>
        </div>
      }
    >
      {tests.length === 0 ? (
        <p className="text-xs text-slate-400">No challenge tests yet — add a Power Failure or Open Door test.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {tests.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{TYPE_LABELS[t.type]}</span>
                <button
                  type="button"
                  onClick={() => removeTest(t.id)}
                  className="text-slate-400 hover:text-rose-500"
                  aria-label="Remove test"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Date
                  </span>
                  <input
                    type="date"
                    className={cellInput}
                    value={t.date}
                    onChange={(e) => patch(t.id, { date: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Start time
                  </span>
                  <input
                    type="time"
                    className={cellInput}
                    value={t.startTime}
                    onChange={(e) => patch(t.id, { startTime: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    End time
                  </span>
                  <input
                    type="time"
                    className={cellInput}
                    value={t.endTime}
                    onChange={(e) => patch(t.id, { endTime: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Planned duration (min)
                  </span>
                  <input
                    type="number"
                    className={cellInput}
                    value={t.plannedDurationMinutes}
                    onChange={(e) => patch(t.id, { plannedDurationMinutes: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
