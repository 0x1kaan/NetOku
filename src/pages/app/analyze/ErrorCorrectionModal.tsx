import { useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeStore } from '@/store/analyzeStore';
import type { StudentRow } from '@/types/domain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ErrorCorrectionModal({ open, onOpenChange }: Props) {
  const { parsed, patchStudent } = useAnalyzeStore();
  const [editing, setEditing] = useState<number | null>(null);

  const rows = useMemo(() => {
    if (!parsed) return [] as Array<{ student: StudentRow; reasons: string[] }>;

    const reasonsByLine = new Map<number, string[]>();
    const duplicateCounts = new Map<string, number>();

    parsed.students.forEach((student) => {
      if (student.studentId) {
        duplicateCounts.set(student.studentId, (duplicateCounts.get(student.studentId) ?? 0) + 1);
      }
    });

    parsed.issues.forEach((issue) => {
      if (
        issue.type !== 'invalid_student_id' &&
        issue.type !== 'missing_booklet' &&
        issue.type !== 'duplicate_student_id'
      ) {
        return;
      }

      const reasons = reasonsByLine.get(issue.lineNumber) ?? [];
      if (issue.type === 'invalid_student_id') reasons.push('Öğrenci no hatalı');
      if (issue.type === 'missing_booklet') reasons.push('Kitapçık boş');
      if (issue.type === 'duplicate_student_id') reasons.push('Mükerrer öğrenci no');
      reasonsByLine.set(issue.lineNumber, reasons);
    });

    return parsed.students
      .filter(
        (student) =>
          reasonsByLine.has(student.lineNumber) || (duplicateCounts.get(student.studentId) ?? 0) > 1,
      )
      .map((student) => ({
        student,
        reasons: Array.from(
          new Set([
            ...(reasonsByLine.get(student.lineNumber) ?? []),
            ...(duplicateCounts.get(student.studentId) ?? 0) > 1 ? ['Mükerrer öğrenci no'] : [],
          ]),
        ),
      }))
      .sort((left, right) => left.student.lineNumber - right.student.lineNumber);
  }, [parsed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Hatalı Kayıtları Düzelt
          </DialogTitle>
          <DialogDescription>
            Kitapçık, geçersiz numara ve mükerrer öğrenci numarası sorunlarını bu ekrandan düzeltip analizi tekrar çalıştırabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="border-2 border-ink bg-paper p-6 text-center text-sm text-ink-muted">
            Düzeltilecek satır kalmadı.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(({ student, reasons }) => (
              <Row
                key={student.lineNumber}
                student={student}
                reasons={reasons}
                editing={editing === student.lineNumber}
                onEdit={() => setEditing(student.lineNumber)}
                onCancel={() => setEditing(null)}
                onSave={(patch) => {
                  patchStudent(student.lineNumber, patch);
                  setEditing(null);
                }}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>Tamam</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  student,
  reasons,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  student: StudentRow;
  reasons: string[];
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: { studentId?: string; booklet?: string }) => void;
}) {
  const [studentId, setStudentId] = useState(student.studentId);
  const [booklet, setBooklet] = useState(student.booklet || 'A');

  return (
    <div className="border-2 border-ink p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{student.name || '(Ad yok)'}</div>
          <div className="text-xs text-ink-muted">
            Satır {student.lineNumber} · {reasons.join(' · ')}
          </div>
          <div className="mt-2 bg-paper px-2 py-1 font-mono text-[11px] text-ink-muted">
            {student.rawLine}
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="paper" onClick={onEdit} className="gap-1">
            <Pencil className="h-3.5 w-3.5" /> Düzenle
          </Button>
        )}
      </div>
      {editing && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`sid-${student.lineNumber}`}>Öğrenci No</Label>
            <Input
              id={`sid-${student.lineNumber}`}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.trim())}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`book-${student.lineNumber}`}>Kitapçık</Label>
            <Input
              id={`book-${student.lineNumber}`}
              maxLength={1}
              value={booklet}
              onChange={(e) => setBooklet(e.target.value.toUpperCase().slice(0, 1))}
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button
              size="sm"
              variant="ink"
              className="gap-1"
              onClick={() => onSave({ studentId, booklet })}
            >
              <Save className="h-3.5 w-3.5" /> Kaydet
            </Button>
            <Button size="sm" variant="paper" onClick={onCancel}>
              İptal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
