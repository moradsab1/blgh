import { useIncident } from './useIncident';
import { useComments } from './useComments';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import type { Incident, Comment } from '../../lib/contracts';

const CATEGORY_AR: Record<string, string> = {
  GUNFIRE: 'إطلاق نار',
  STABBING: 'طعن',
  ASSAULT: 'اعتداء',
  ROBBERY: 'سرقة',
  SUSPICIOUS: 'مريب',
  OTHER: 'أخرى',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'بالغ الخطورة',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#E5484D',
  high: '#F76808',
  medium: '#FFB224',
  low: '#3B82F6',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-2.5 py-3 border-b border-border last:border-0">
      <div className="flex-shrink-0 text-lg leading-none pt-0.5">
        {comment.identityTag.join('')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">{comment.body}</p>
        <span className="text-[10px] text-text-muted mt-0.5 block">
          {formatDate(comment.createdAt)}
        </span>
      </div>
    </div>
  );
}

function IncidentBody({ incident }: { incident: Incident }) {
  const color = SEVERITY_COLOR[incident.severity] ?? '#9AA7B4';
  const { data: comments = [], isLoading: commentsLoading } = useComments(incident.id);

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header block */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ color, backgroundColor: `${color}20` }}
          >
            {SEVERITY_LABEL[incident.severity]}
          </span>
          <span className="font-mono text-xs text-text-muted">{incident.ref}</span>
        </div>
        <h2 className="text-base font-semibold text-text-primary">
          {CATEGORY_AR[incident.category] ?? incident.category}
        </h2>
        {incident.description && (
          <p className="text-sm text-text-secondary leading-relaxed">{incident.description}</p>
        )}
      </div>

      {/* Timestamps */}
      <section aria-label="التواريخ" className="space-y-1 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>وقت الإبلاغ</span>
          <span>{formatDate(incident.createdAt)}</span>
        </div>
        {incident.resolvedAt && (
          <div className="flex justify-between">
            <span>وقت الحل</span>
            <span className="text-state-calm">{formatDate(incident.resolvedAt)}</span>
          </div>
        )}
      </section>

      {/* Coordinates */}
      <section aria-label="الموقع" className="bg-surface-alt rounded-lg px-3 py-2 space-y-0.5">
        <p className="text-[10px] text-text-muted uppercase tracking-wide">الإحداثيات</p>
        <p className="font-mono text-xs text-text-secondary">
          {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
        </p>
      </section>

      {/* Vote counts */}
      <section aria-label="التحقق" className="flex gap-3">
        <div className="flex-1 rounded-lg bg-surface-alt p-3 text-center">
          <div className="text-state-calm text-lg font-bold">{incident.confirmations}</div>
          <div className="text-[10px] text-text-muted mt-0.5">تأكيد</div>
        </div>
        <div className="flex-1 rounded-lg bg-surface-alt p-3 text-center">
          <div className="text-severity-critical text-lg font-bold">{incident.denials}</div>
          <div className="text-[10px] text-text-muted mt-0.5">نفي</div>
        </div>
      </section>

      {/* Deferred: assignee selector stub */}
      <section aria-label="الإسناد" className="space-y-1.5">
        <p className="text-[10px] text-text-muted uppercase tracking-wide">إسناد المهمة</p>
        <button
          disabled
          aria-disabled="true"
          title="يتطلب ميزة خلفية مستقبلية"
          className="w-full px-3 py-2 rounded-lg border border-border text-text-muted text-xs text-start cursor-not-allowed opacity-40"
        >
          اختيار المسؤول — قيد التطوير
        </button>
      </section>

      {/* Deferred: narrative field stub */}
      <section aria-label="الرواية" className="space-y-1.5">
        <p className="text-[10px] text-text-muted uppercase tracking-wide">تقرير الحادثة</p>
        <textarea
          disabled
          aria-disabled="true"
          title="يتطلب ميزة خلفية مستقبلية"
          placeholder="كتابة تقرير — قيد التطوير"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border text-text-muted text-xs resize-none cursor-not-allowed opacity-40 bg-transparent"
        />
      </section>

      {/* Comments */}
      <section aria-label="التعليقات">
        <p className="text-[10px] text-text-muted uppercase tracking-wide mb-2">
          التعليقات ({incident.commentCount})
        </p>
        {commentsLoading && (
          <div className="flex justify-center py-4">
            <Spinner size={16} />
          </div>
        )}
        {!commentsLoading && comments.length === 0 && (
          <p className="text-xs text-text-muted py-4 text-center">لا توجد تعليقات</p>
        )}
        {!commentsLoading && comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </section>
    </div>
  );
}

interface Props {
  incidentId: string;
}

export default function IncidentDetail({ incidentId }: Props) {
  const { data: incident, isLoading, isError, refetch } = useIncident(incidentId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <ErrorState
        message="تعذّر تحميل الحادثة"
        onRetry={() => refetch()}
      />
    );
  }

  return <IncidentBody incident={incident} />;
}
