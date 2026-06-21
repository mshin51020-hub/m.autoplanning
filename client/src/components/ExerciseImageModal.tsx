import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, Info } from "lucide-react";

interface ExerciseImageModalProps {
  exerciseName: string;
  children: React.ReactNode;
}

/**
 * 種目名をクリックするとWger/AI生成画像をモーダルで表示するコンポーネント。
 * 画像取得はクリック時（遅延ロード）に行い、初期表示のパフォーマンスを確保する。
 */
export function ExerciseImageModal({ exerciseName, children }: ExerciseImageModalProps) {
  const [open, setOpen] = useState(false);

  // モーダルが開いたときのみAPIを呼び出す（enabled: open）
  const { data, isLoading, isError } = trpc.exercise.getImage.useQuery(
    { name: exerciseName },
    { enabled: open, staleTime: 1000 * 60 * 60 * 24 } // 24時間キャッシュ
  );

  return (
    <>
      {/* クリック可能な種目名 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1 group"
        title={`「${exerciseName}」のフォームを確認`}
      >
        {children}
        <Info className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0" />
      </button>

      {/* 画像モーダル */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{exerciseName}</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="w-full h-64 rounded" />
                <p className="text-xs text-muted-foreground text-center">画像を取得中...</p>
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <ImageOff className="w-10 h-10 opacity-40" />
                <p className="text-sm">画像を取得できませんでした</p>
              </div>
            )}

            {!isLoading && !isError && data?.imageUrl && (
              <div className="space-y-2">
                <img
                  src={data.imageUrl}
                  alt={`${exerciseName}のフォーム`}
                  className="w-full rounded object-contain max-h-72 bg-muted/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {data.source === "wger" ? (
                    <>
                      画像提供:{" "}
                      <a
                        href="https://wger.de"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        wger.de
                      </a>{" "}
                      (CC BY-SA 3.0)
                    </>
                  ) : (
                    "AI生成イラスト（参考用）"
                  )}
                </p>
              </div>
            )}

            {!isLoading && !isError && !data?.imageUrl && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <ImageOff className="w-10 h-10 opacity-40" />
                <p className="text-sm">この種目の画像は現在準備中です</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
