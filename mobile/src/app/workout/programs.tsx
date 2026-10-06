import { translate as t, useTranslation } from "@/i18n";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text } from "react-native";
import { programApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ScheduleSelection } from "@/components/workout/ScheduleSelection";
import { colors, spacing } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { dayName } from "@/lib/goal";
import { scheduleRequestId } from "@/lib/trainingSchedule";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import type { WeeklyProgram } from "@/types/models";
export default function ProgramsScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [programs,setPrograms] = useState<WeeklyProgram[]>([]);
  const [error,setError] = useState<string|null>(null);
  const [notice,setNotice] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);
  const requests = useRef(new Map<string,string>());
  const data = useTrainingScheduleStore(s=>s.data);
  const load = useCallback(async () => {
    try { setPrograms((await programApi.list()).items); await useTrainingScheduleStore.getState().load(); }
    catch(e) { setError(errorMessage(e)); }
  },[]);
  useFocusEffect(useCallback(()=>{ void load(); },[load]));
  async function apply(id:string) {
    if(busy) return;
    setBusy(true); setError(null);
    const key=requests.current.get(id)??scheduleRequestId(); requests.current.set(id,key);
    try { const result=await useTrainingScheduleStore.getState().apply(id,key);
      requests.current.delete(id); setNotice(t("Đã áp dụng từ {value1}.", { value1: result.pending?.effectiveFrom??result.current?.effectiveFrom }));
    } catch(e) { setError(errorMessage(e)); } finally {setBusy(false);}
  }
  return <ScrollView contentContainerStyle={{padding:spacing.lg,gap:spacing.lg}}>
    <ErrorBanner message={error}/>
    {notice?<Text style={{color:colors.success}}>{notice}</Text>:null}
    <Text style={{color:colors.text}}>{t("Đang áp dụng: {value1}. {value2}", { value1: data?.current?.name??t("Chưa chọn lịch"), value2: data?.current?t("Đổi lịch có hiệu lực từ ngày mai."):t("Lịch đầu tiên bắt đầu hôm nay.") })}</Text>
    {data?.pending?<Text style={{color:colors.textMuted}}>{t("Sắp áp dụng: {value1}, từ {value2}.", { value1: data.pending.name, value2: data.pending.effectiveFrom })}</Text>:null}
    {programs.map(p=><Card key={p.id} title={p.name}>
      {p.days.map(d=><Text key={d.dayOfWeek} style={{color:colors.text}}>{dayName(d.dayOfWeek)} · {d.templateName??t("Buổi đã xóa")}</Text>)}
      <Button title={t("Áp dụng {value1}", { value1: p.name })} onPress={()=>apply(p.id)} disabled={busy}/>
      <Button title={t("Sửa lịch và bài tập")} variant="secondary" onPress={()=>router.push({pathname:"/workout/program",params:{id:p.id}})}/>
    </Card>)}
    <Card title={t("Chọn lịch tuần đề xuất")}><ScheduleSelection onApplied={load}/></Card>
  </ScrollView>;
}