import { useAuth } from "@/_core/hooks/useAuth";
import DisclaimerModal from "@/components/DisclaimerModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock, Flame, Activity, Heart } from "lucide-react";
import { toast } from "sonner";

const MUSCLE_GROUPS = [
  { value: "胸", label: "胸" },
  { value: "背中", label: "背中" },
  { value: "肩", label: "肩" },
  { value: "脚", label: "脚" },
  { value: "腹筋", label: "腹筋" },
  { value: "二頭筋", label: "二頭筋" },
  { value: "三頭筋", label: "三頭筋" },
] as const;

// 強度レベルの定義
const INTENSITY_OPTIONS = [
  {
    value: "low",
    label: "低強度",
    description: "2セット・高レップ（軽い重量で多く）",
    detail: "フォームの習得や疲労回復期に最適",
    badge: "LIGHT",
  },
  {
    value: "normal",
    label: "標準",
    description: "3セット・8〜12回（一般的な筋肥大域）",
    detail: "ほとんどの人に推奨されるバランス設定",
    badge: "STANDARD",
    default: true,
  },
  {
    value: "high",
    label: "高強度",
    description: "4セット・低レップ（重い重量で少なく）",
    detail: "筋力・筋肥大を最大化したい上級者向け",
    badge: "HEAVY",
  },
] as const;

// アプリ版限定の目標一覧
const APP_ONLY_GOALS = [
  { value: "fat_loss", label: "脂肪燃焼" },
  { value: "strength", label: "筋力向上" },
  { value: "endurance", label: "持久力向上" },
  { value: "health", label: "健康維持" },
];

// 全身法強制目標（部位選択・分割法選択不要）
const FULL_BODY_GOAL_VALUES = ["fat_loss", "endurance", "health"] as const;

const ALL_WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const WEEK_DAY_LABELS = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"] as const;

// アプリ版限定の期間一覧
const APP_ONLY_DURATIONS = [
  { value: "1month", label: "1ヶ月" },
  { value: "3months", label: "3ヶ月" },
  { value: "6months", label: "6ヶ月" },
  { value: "12months", label: "12ヶ月" },
];

export default function ProfileForm() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [goal, setGoal] = useState<string>("muscle_gain");
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState<string>("");
  const [equipmentAccess, setEquipmentAccess] = useState<string>("");
  // web版は1週間のみ対応
  const planDuration = "1week";
  const [targetMuscles, setTargetMuscles] = useState<string[]>([]);
  const [intensityLevel, setIntensityLevel] = useState<"low" | "normal" | "high">("normal");
  const [intensityManuallySet, setIntensityManuallySet] = useState(false);
  // 筋力向上目標時の1RM入力
  const [oneRepMaxSquat, setOneRepMaxSquat] = useState("");
  const [oneRepMaxDeadlift, setOneRepMaxDeadlift] = useState("");
  const [oneRepMaxBench, setOneRepMaxBench] = useState("");

  // 完全初心者選択時に強度を自動で「低強度」に切り替える
  useEffect(() => {
    if (!intensityManuallySet) {
      if (experienceLevel === "none") {
        setIntensityLevel("low");
      } else if (experienceLevel !== "") {
        setIntensityLevel("normal");
      }
    }
  }, [experienceLevel, intensityManuallySet]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);

  // 免責事項の同意状態を取得
  const { data: disclaimerStatus, isLoading: disclaimerLoading } = trpc.auth.disclaimerStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 既存プロフィールの読み込み
  const { data: existingProfile } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.height) setHeight(String(existingProfile.height));
      if (existingProfile.weight) setWeight(String(existingProfile.weight));
      if (existingProfile.age) setAge(String(existingProfile.age));
      if (existingProfile.gender) setGender(existingProfile.gender);
      if (existingProfile.experienceLevel) setExperienceLevel(existingProfile.experienceLevel);
      // goal・planDurationはweb版固定なので読み込まない
      const savedDays = existingProfile.trainingDays as string[] | null;
      if (savedDays && Array.isArray(savedDays) && savedDays.length > 0) {
        setSelectedTrainingDays(savedDays);
      } else if (existingProfile.availableDaysPerWeek) {
        setSelectedTrainingDays(WEEK_DAY_LABELS.slice(0, existingProfile.availableDaysPerWeek) as unknown as string[]);
      }
      if (existingProfile.dailyMinutes) setDailyMinutes(String(existingProfile.dailyMinutes));
      if (existingProfile.equipmentAccess) setEquipmentAccess(existingProfile.equipmentAccess);
      if (existingProfile.targetMuscles && Array.isArray(existingProfile.targetMuscles)) {
        setTargetMuscles(existingProfile.targetMuscles as string[]);
      }
    }
  }, [existingProfile]);

  const generatePlan = trpc.menu.generate.useMutation({
    onSuccess: (data) => {
      if (data.id) {
        // ログイン時は保存済みプランページへ
        setLocation(`/plan/${data.id}`);
      } else {
        // ゲスト時はプランデータをsessionStorageに保存して結果ページへ
        sessionStorage.setItem("guest_plan", JSON.stringify(data.plan));
        setLocation("/plan/guest");
      }
    },
    onError: (error) => {
      toast.error("トレーニングの作成に失敗しました: " + error.message);
    },
  });

  const saveProfile = trpc.profile.upsert.useMutation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ageNum = parseInt(age);
  const ageError = age && (isNaN(ageNum) || ageNum < 13 || ageNum > 100)
    ? ageNum < 13 ? "13歳未満の方はご利用いただけません" : "100歳以下で入力してください"
    : null;
  const isFormValid = height && weight && age && !ageError && gender && experienceLevel && selectedTrainingDays.length > 0 && equipmentAccess;

  const handleToggleMuscle = (muscle: string) => {
    setTargetMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const executeGenerate = async () => {
    const profileData = {
      height: parseFloat(height),
      weight: parseFloat(weight),
      age: parseInt(age),
      gender: gender as "male" | "female" | "other",
      experienceLevel: experienceLevel as "none" | "beginner" | "intermediate" | "advanced",
      goal: goal as "muscle_gain" | "fat_loss" | "strength" | "endurance" | "health",
      trainingDays: selectedTrainingDays as ("月曜日" | "火曜日" | "水曜日" | "木曜日" | "金曜日" | "土曜日" | "日曜日")[],
      availableDaysPerWeek: selectedTrainingDays.length,
      dailyMinutes: dailyMinutes ? parseInt(dailyMinutes) : undefined,
      equipmentAccess: equipmentAccess as "home" | "gym" | "both",
      // fat_loss / endurance / health は全身法強制のため部位選択を送信しない
      targetMuscles: (FULL_BODY_GOAL_VALUES as readonly string[]).includes(goal) ? undefined : (targetMuscles.length > 0 ? targetMuscles : undefined),
      intensityLevel: goal === "endurance" ? "normal" : intensityLevel,
      oneRepMax: goal === "strength" && (oneRepMaxSquat || oneRepMaxDeadlift || oneRepMaxBench) ? {
        squat: oneRepMaxSquat ? parseFloat(oneRepMaxSquat) : undefined,
        deadlift: oneRepMaxDeadlift ? parseFloat(oneRepMaxDeadlift) : undefined,
        benchPress: oneRepMaxBench ? parseFloat(oneRepMaxBench) : undefined,
      } : undefined,
      weekSeed: goal === "health" ? Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) : undefined,
    };

    // ログイン時のみプロフィールを保存
    if (isAuthenticated) {
      await saveProfile.mutateAsync(profileData);
    }

    // 統合API: web版は常に1週間プランで生成
    generatePlan.mutate({
      ...profileData,
      duration: "1week",
    });
  };

  const handleGenerate = async () => {
    if (!isFormValid) {
      toast.error("すべての項目を入力してください");
      return;
    }
    // 免責事項に未同意の場合はモーダルを表示
    const guestAgreed = !isAuthenticated && sessionStorage.getItem("disclaimer_agreed") === "1";
    if (!disclaimerStatus?.agreed && !guestAgreed) {
      setPendingGenerate(true);
      setShowDisclaimer(true);
      return;
    }
    await executeGenerate();
  };

  const handleDisclaimerAgreed = async () => {
    setShowDisclaimer(false);
    if (pendingGenerate) {
      setPendingGenerate(false);
      await executeGenerate();
    }
  };

  const isGenerating = generatePlan.isPending;

  // 選択した部位に基づく分割法の説明
  const getSplitDescription = () => {
    const days = selectedTrainingDays.length;
    if (days === 0) return "";
    if (days <= 2 || targetMuscles.length <= 2) {
      return "全身法";
    }
    if (targetMuscles.length === 0) {
      return "部位分割法（胸・背中・肩・脚）";
    }
    return `部位分割法（${targetMuscles.join("・")}）`;
  };

  return (
    <div className="bg-background text-foreground">
      {/* 免責事項モーダル */}
      <DisclaimerModal
        open={showDisclaimer}
        onAgreed={handleDisclaimerAgreed}
        isGuest={!isAuthenticated}
      />
      <main className="py-12">
        <div className="container max-w-2xl">
          <div className="mb-10">
            <p className="subtext-brutal text-muted-foreground mb-3">ステップ 1</p>
            <h1 className="heading-brutal text-3xl sm:text-4xl mb-4">
              あなたの情報を
              <br />
              入力してください
            </h1>
            <p className="text-muted-foreground">
              正確な情報を入力することで、全身法または部位分割法に基づいた最適なトレーニングが作成されます。
            </p>
          </div>

          <div className="space-y-6">
            {/* 身体情報 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold tracking-wide">身体情報</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="subtext-brutal text-muted-foreground">身長 (cm)</Label>
                  <Input
                    type="number"
                    placeholder="170"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="mt-2 bg-input border-border"
                  />
                </div>
                <div>
                  <Label className="subtext-brutal text-muted-foreground">体重 (kg)</Label>
                  <Input
                    type="number"
                    placeholder="65"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-2 bg-input border-border"
                  />
                </div>
                <div>
                  <Label className="subtext-brutal text-muted-foreground">年齢</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    min={13}
                    max={100}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className={`mt-2 bg-input border-border ${ageError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {ageError && (
                    <p className="mt-1 text-xs text-red-500">{ageError}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 性別・トレーニング歴 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold tracking-wide">基本設定</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="subtext-brutal text-muted-foreground">性別</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="mt-2 bg-input border-border">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">男性</SelectItem>
                      <SelectItem value="female">女性</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="subtext-brutal text-muted-foreground">トレーニング歴</Label>
                  <Select value={experienceLevel} onValueChange={(v) => { setExperienceLevel(v); setIntensityManuallySet(false); }}>
                    <SelectTrigger className="mt-2 bg-input border-border">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">全くなし</SelectItem>
                      <SelectItem value="beginner">初心者（1年未満）</SelectItem>
                      <SelectItem value="intermediate">中級者（1〜3年）</SelectItem>
                      <SelectItem value="advanced">上級者（3年以上）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 目標と環境 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold tracking-wide">目標と環境</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 目標 */}
                <div>
                  <Label className="subtext-brutal text-muted-foreground">目標</Label>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { value: "muscle_gain", label: "筋肥大" },
                      { value: "fat_loss", label: "脂肪燃焼" },
                      { value: "strength", label: "筋力向上" },
                      { value: "endurance", label: "持久力向上" },
                      { value: "health", label: "健康維持" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setGoal(item.value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 border text-sm font-bold tracking-wide transition-colors ${
                          goal === item.value
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-transparent text-foreground hover:border-foreground/60"
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* トレーニング環境 */}
                <div>
                  <Label className="subtext-brutal text-muted-foreground">トレーニング環境</Label>
                  <Select value={equipmentAccess} onValueChange={setEquipmentAccess}>
                    <SelectTrigger className="mt-2 bg-input border-border">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">自宅（自重・ダンベル）</SelectItem>
                      <SelectItem value="gym">ジム</SelectItem>
                      <SelectItem value="both">両方</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* トレーニング曜日 */}
                <div className="sm:col-span-2">
                  <Label className="subtext-brutal text-muted-foreground">
                    トレーニングする曜日
                    {selectedTrainingDays.length > 0 && (
                      <span className="ml-2 text-primary font-bold">（週{selectedTrainingDays.length}日）</span>
                    )}
                  </Label>
                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {ALL_WEEK_DAYS.map((short, i) => {
                      const full = WEEK_DAY_LABELS[i];
                      const isSelected = selectedTrainingDays.includes(full);
                      return (
                        <button
                          key={full}
                          type="button"
                          onClick={() => {
                            setSelectedTrainingDays(prev =>
                              prev.includes(full) ? prev.filter(d => d !== full) : [...prev, full]
                            );
                          }}
                          className={`
                            py-2.5 text-sm font-bold tracking-wide border transition-all duration-150
                            ${isSelected
                              ? "bg-foreground text-background border-foreground"
                              : "bg-transparent text-foreground border-border hover:border-foreground"}
                          `}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1日のトレーニング時間 */}
                <div>
                  <Label className="subtext-brutal text-muted-foreground">1日のトレーニング時間</Label>
                  <Select value={dailyMinutes} onValueChange={setDailyMinutes}>
                    <SelectTrigger className="mt-2 bg-input border-border">
                      <SelectValue placeholder="選択してください（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30分</SelectItem>
                      <SelectItem value="45">45分</SelectItem>
                      <SelectItem value="60">60分</SelectItem>
                      <SelectItem value="90">90分</SelectItem>
                      <SelectItem value="120">120分以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* トレーニング期間 */}
                <div className="sm:col-span-2">
                  <Label className="subtext-brutal text-muted-foreground">トレーニング期間</Label>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {/* 1週間: web版で利用可能（固定選択済み） */}
                    <div className="flex items-center justify-between px-3 py-2.5 border border-foreground bg-foreground text-background text-sm font-bold tracking-wide">
                      <span>1週間</span>
                    </div>
                    {/* アプリ版限定の期間 */}
                    {APP_ONLY_DURATIONS.map((item) => (
                      <div
                        key={item.value}
                        className="flex items-center justify-between px-3 py-2.5 border border-border/40 text-sm text-muted-foreground/50 cursor-not-allowed select-none"
                      >
                        <span>{item.label}</span>
                        <span className="badge-coming-soon">
                          <Lock className="h-2.5 w-2.5" />
                          Coming Soon
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    ※ 1ヶ月以上のプランはアプリ版でご利用いただけます（リリース予定）
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 筋力向上目標時のBIG3最大重量入力 */}
            {goal === "strength" && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base font-bold tracking-wide">BIG3の最大重量（任意）</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    入力すると最適な重量が自動計算されます。不明な場合は空欄のままで構いません。
                  </p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="subtext-brutal text-muted-foreground">スクワット (kg)</Label>
                    <Input
                      type="number"
                      placeholder="例: 80"
                      value={oneRepMaxSquat}
                      onChange={(e) => setOneRepMaxSquat(e.target.value)}
                      className="mt-2 bg-input border-border"
                    />
                  </div>
                  <div>
                    <Label className="subtext-brutal text-muted-foreground">デッドリフト (kg)</Label>
                    <Input
                      type="number"
                      placeholder="例: 100"
                      value={oneRepMaxDeadlift}
                      onChange={(e) => setOneRepMaxDeadlift(e.target.value)}
                      className="mt-2 bg-input border-border"
                    />
                  </div>
                  <div>
                    <Label className="subtext-brutal text-muted-foreground">ベンチプレス (kg)</Label>
                    <Input
                      type="number"
                      placeholder="例: 60"
                      value={oneRepMaxBench}
                      onChange={(e) => setOneRepMaxBench(e.target.value)}
                      className="mt-2 bg-input border-border"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 全身法目標時の説明バナー */}
            {(FULL_BODY_GOAL_VALUES as readonly string[]).includes(goal) && (
              <div className="p-4 border border-border bg-muted/30">
                <p className="text-sm font-bold mb-1 flex items-center gap-1.5">
                  {goal === "fat_loss" && <><Flame className="w-4 h-4 text-primary shrink-0" /> 全身を使った有酸素・筋力トレーニングで脂肪燃焼を最大化</>}
                  {goal === "endurance" && <><Activity className="w-4 h-4 text-primary shrink-0" /> サーキット形式の全身トレーニングで心肺機能・持久力を向上</>}
                  {goal === "health" && <><Heart className="w-4 h-4 text-primary shrink-0" /> ストレッチ・モビリティ・筋力を組み合わせた健康維持メニュー</>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {goal === "fat_loss" && "バーピー・ケトルベルスイングなどの有酸素種目と全身筋力トレーニングを組み合わせ、インターバルを短くして消費カロリーを最大化します。部位選択は不要です。"}
                  {goal === "endurance" && "複数種目を連続して行うサーキット形式。インターバル30秒以内で心拍数を高い状態を維持します。部位選択・強度選択は不要です。"}
                  {goal === "health" && "ストレッチ・モビリティ・身体活動をバランス良く組み合わせます。週ごとに種目を変化させて飽きを防います。部位選択は不要です。"}
                </p>
              </div>
            )}

            {/* トレーニング強度：enduranceはサーキット固定なので非表示、fat_loss/healthは表示 */}
            {goal !== "endurance" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold tracking-wide">トレーニング強度</CardTitle>
                  {experienceLevel === "none" && !intensityManuallySet && (
                    <span className="text-[10px] font-bold tracking-widest border border-blue-500/60 text-blue-400 px-1.5 py-0.5">
                      自動設定
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  強度に応じてセット数・回数・インターバルが自動調整されます。トレーニング歴「全くなし」の場合は低強度が自動選択されます。
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {INTENSITY_OPTIONS.map((opt) => {
                    const isSelected = intensityLevel === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setIntensityLevel(opt.value); setIntensityManuallySet(true); }}
                        className={`
                          flex flex-col gap-1.5 px-4 py-3 border text-left
                          transition-all duration-150 ease-out cursor-pointer
                          ${
                            isSelected
                              ? "bg-foreground text-background border-foreground"
                              : "bg-transparent text-foreground border-border hover:border-foreground"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold tracking-wide">{opt.label}</span>
                          <span
                            className={`text-[10px] font-bold tracking-widest px-1.5 py-0.5 border ${
                              isSelected
                                ? "border-background/40 text-background/70"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <p
                          className={`text-xs leading-snug ${
                            isSelected ? "text-background/80" : "text-muted-foreground"
                          }`}
                        >
                          {opt.description}
                        </p>
                        <p
                          className={`text-[11px] leading-snug mt-0.5 ${
                            isSelected ? "text-background/60" : "text-muted-foreground/70"
                          }`}
                        >
                          {opt.detail}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {/* 強度プレビュー */}
                <div className="mt-4 p-3 bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground tracking-wide uppercase mb-1">選択中の強度設定</p>
                  {intensityLevel === "low" && (
                    <p className="text-sm font-bold">2セット・高レップ数・短いインターバル（〜45秒）</p>
                  )}
                  {intensityLevel === "normal" && (
                    <p className="text-sm font-bold">3セット・8〜12回・標準インターバル（90〜120秒）</p>
                  )}
                  {intensityLevel === "high" && (
                    <p className="text-sm font-bold">4セット・低レップ数・長いインターバル（2〜3分）</p>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* 特に鍛えたい部位：muscle_gain / strengthのみ表示 */}
            {!(FULL_BODY_GOAL_VALUES as readonly string[]).includes(goal) && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold tracking-wide">鍛えたい部位を選択</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  選択した部位に基づいてトレーニング日を分割します。未選択の場合は主要4部位（胸・背中・肩・脚）で分割します。
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MUSCLE_GROUPS.map((group) => {
                    const isSelected = targetMuscles.includes(group.value);
                    return (
                      <button
                        key={group.value}
                        type="button"
                        onClick={() => handleToggleMuscle(group.value)}
                        className={`
                          flex items-center justify-center gap-2 px-4 py-3 border text-sm font-bold tracking-wide
                          transition-all duration-150 ease-out cursor-pointer
                          ${
                            isSelected
                              ? "bg-foreground text-background border-foreground"
                              : "bg-transparent text-foreground border-border hover:border-foreground"
                          }
                        `}
                      >
                        {group.label}
                      </button>
                    );
                  })}
                </div>
                {/* 分割法プレビュー */}
                {selectedTrainingDays.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground tracking-wide uppercase mb-1">分割法</p>
                    <p className="text-sm font-bold">{getSplitDescription()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* 生成ボタン */}
            <div className="pt-6">
              <Button
                size="lg"
                className="btn-press w-full font-bold tracking-wide py-6 text-base"
                onClick={handleGenerate}
                disabled={!isFormValid || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <img src="/icon.svg" alt="" aria-hidden="true" role="presentation" className="w-5 h-5 object-contain mr-2" />
                )}
                トレーニングを作成する
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                入力情報に基づいて、全身法または部位分割法によるトレーニングを自動作成します
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
