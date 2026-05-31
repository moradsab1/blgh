import DevStub from '../components/DevStub';

export default function PartnerWorkspace() {
  return (
    <DevStub
      surfaceId="11"
      surfaceAr="مساحة عمل الشركاء"
      tier="coalition"
      descriptionAr="فضاء تعاون بين المنظمات الشريكة — خيوط نقاش، سياق Trend Studio المثبت، وفلتر تلقائي يحظر إرسال المعرّفات الفردية لحماية الخصوصية."
      blockedOn={[
        'cross-NGO messaging system',
        'partner identity + invitation model',
        'client-side identifier filter (PII)',
        'NGO-tier authentication',
      ]}
    />
  );
}
