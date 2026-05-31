import DevStub from '../components/DevStub';

export default function MayorsBrief() {
  return (
    <DevStub
      surfaceId="08"
      surfaceAr="موجز رئيس السلطة المحلية"
      tier="council"
      descriptionAr="ملخص تنفيذي دوري بإحصاءات الحوادث المحلية، وسرعة الاستجابة، ومقارنة الأداء مع البلديات المجاورة. يتضمن تصدير PDF/CSV/PPT وتقارير منتظمة للقيادة."
      blockedOn={[
        'analytics aggregation endpoints',
        'PDF/CSV/PPT export service',
        'response-time metrics in backend',
        'peer-municipality comparison data',
      ]}
    />
  );
}
