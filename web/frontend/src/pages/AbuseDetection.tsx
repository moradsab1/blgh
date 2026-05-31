import DevStub from '../components/DevStub';

export default function AbuseDetection() {
  return (
    <DevStub
      surfaceId="15"
      surfaceAr="لوحة مكافحة إساءة الاستخدام"
      tier="operator"
      descriptionAr="شاشة رصد تهديدات في الوقت الفعلي — بانر طوارئ 'تنبيه نشط'، مراقبة وضع التهديد (انحراف معياري 2σ)، جدول التهديدات، وآلية موافقة رباعية العيون للتغييرات الجوهرية في السياسات."
      blockedOn={[
        'velocity / anomaly scoring engine',
        'threat-score baseline model',
        'policy engine + dual-approval (4-eyes) workflow',
        'operator-tier RBAC authentication',
        'real-time threat event stream',
      ]}
    />
  );
}
