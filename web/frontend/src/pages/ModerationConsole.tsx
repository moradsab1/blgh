import DevStub from '../components/DevStub';

export default function ModerationConsole() {
  return (
    <DevStub
      surfaceId="14"
      surfaceAr="كونسول مراجعة البلاغات"
      tier="operator"
      descriptionAr="قائمة مراجعة مدخلات للمشرفين، مع إخفاء تلقائي للبيانات الشخصية [تم إخفاء البيانات الشخصية حفاظاً على السرية]، وإجراءات مرتبطة بلوحة المفاتيح (A موافقة / R رفض / M دمج / J·K التنقل)."
      blockedOn={[
        'moderation intake queue endpoint',
        'auto-PII detection + redaction service',
        'duplicate-clustering algorithm',
        'operator-tier RBAC authentication',
        'audit log (append-only signed)',
      ]}
    />
  );
}
