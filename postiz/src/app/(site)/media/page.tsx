import { MediaBox } from '@/components/media/media.component';

export const metadata = { title: 'Postiz Media' };

export default function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex flex-col p-[20px] mobile:p-[12px] min-h-[600px]">
      <MediaBox standalone />
    </div>
  );
}
