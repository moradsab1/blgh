import DevStub from '../components/DevStub';

export default function NationalDashboard() {
  return (
    <DevStub
      surfaceId="09"
      surfaceAr="لوحة المؤشرات الوطنية"
      tier="coalition"
      descriptionAr="لوحة تحليلات على مستوى الدولة تعرض تغطية البلديات المشاركة، ومعدلات الإبلاغ الإقليمية، ونقاط الشذوذ (z-score ≥ 2.5)، مع تسمية البيانات المؤقتة."
      blockedOn={[
        'analytics aggregation pipeline',
        'fuzzed-coordinate aggregate boundary',
        'multi-municipality data federation',
        'statistical disclosure control (n≥3)',
        'multi-tenant identity (NGO auth)',
      ]}
    />
  );
}
