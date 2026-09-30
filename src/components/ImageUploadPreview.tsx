import { Image as ImageIcon, X } from 'lucide-react';
export default function ImageUploadPreview({ value, onChange, onError }: { value?: string; onChange: (v?: string) => void; onError: (m: string) => void }) {
  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return onError('Please choose an image file.');
    if (f.size > 700 * 1024) return onError('Image must be under 700 KB for this demo.');
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Selected issue preview" className="h-32 rounded-lg border border-line object-cover" />
          <button type="button" onClick={() => onChange(undefined)} aria-label="Remove photo" className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow"><X size={14} /></button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-line bg-canvas p-5 text-sm text-muted hover:bg-light">
          <ImageIcon size={24} /> Tap to upload a photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}
