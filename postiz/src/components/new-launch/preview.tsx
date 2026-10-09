'use client';

import clsx from 'clsx';
import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MediaPreview } from '@/components/media/media.component';
import { platformIcon } from '@/lib/providers';
import { Integration, PostValue } from '@/lib/types';
import { useLaunchStore } from './store';

const Verified = () => (
  <svg viewBox="0 0 22 22" aria-label="Verified account" role="img" className="max-w-[20px] max-h-[20px] fill-current h-[1.25em]">
    <g>
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
    </g>
  </svg>
);

const MediaGrid: FC<{ media: PostValue['media']; rounded?: string }> = ({ media, rounded = 'rounded-[16px]' }) =>
  media.length ? (
    <div className={clsx('w-full overflow-hidden mt-[12px]', rounded, media.length > 3 ? 'grid grid-cols-2 gap-[4px]' : 'flex gap-[4px]')}>
      {media.map((m, i) => (
        <div key={m.id + i} className="flex-1 aspect-[4/3] min-w-0">
          <MediaPreview media={m} />
        </div>
      ))}
    </div>
  ) : null;

const isEmpty = (values: PostValue[]) => !values.some((v) => v.content || v.media.length);

// The X styled preview Postiz uses for global edit and most providers
export const GeneralPreview: FC<{ values: PostValue[]; integration?: Integration }> = ({ values, integration }) => (
  <div className="w-full p-[15px]">
    <div className="w-full h-full relative flex flex-col">
      {values.map((value, index) => (
        <div key={value.id} className={clsx('flex gap-[8px] relative animate-normalFadeIn', index === values.length - 1 ? 'pb-[12px]' : 'pb-[24px]')}>
          <div className="min-w-[40px] h-[40px] min-h-[40px] w-[40px] flex flex-col items-center">
            <div className="relative">
              <img src={integration?.picture || '/no-picture.jpg'} alt="" className="rounded-full relative z-[2] w-[40px] h-[40px]" />
              {integration && (
                <img src={platformIcon(integration.identifier)} className="w-[20px] h-[20px] rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth" alt="" />
              )}
            </div>
            {index !== values.length - 1 && <div className="flex-1 w-[2px] h-[calc(100%-10px)] bg-customColor25 absolute top-[10px] z-[1]" />}
          </div>
          <div className="flex-1 flex flex-col gap-[4px] min-w-0">
            <div className="flex items-center">
              <div className="h-[22px] text-[15px] font-[700]">{integration ? integration.name : 'Global Edit'}</div>
              <div className="text-[15px] text-customColor26 mt-[1px] ms-[2px]">
                <Verified />
              </div>
              <div className="text-[15px] font-[400] text-customColor27 ms-[4px] truncate">{integration ? integration.display : ''}</div>
              {!!value.delay && index > 0 && (
                <div className="ms-auto text-[11px] bg-[#D82D7E] text-white rounded-full px-[8px]">+{value.delay}m</div>
              )}
            </div>
            <div
              dir="auto"
              className="text-wrap break-words preview-content text-[15px] leading-[20px]"
              dangerouslySetInnerHTML={{ __html: value.content || '<span class="opacity-30">Start writing your post for a preview</span>' }}
            />
            <MediaGrid media={value.media} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LinkedinPreview: FC<{ values: PostValue[]; integration: Integration }> = ({ values, integration }) => {
  const [first, ...comments] = values;
  return (
    <div className="rounded-[12px] border border-borderLinkedin bg-bgLinkedin text-[14px] overflow-hidden shadow-previewShadow">
      <div className="flex gap-[8px] p-[12px]">
        <img src={integration.picture} className="w-[48px] h-[48px] rounded-full" alt="" />
        <div className="flex flex-col">
          <div className="font-[600]">{integration.name}</div>
          <div className="text-[12px] text-textLinkedin">Founder at Postiz Demo</div>
          <div className="text-[12px] text-textLinkedin">now • 🌐</div>
        </div>
      </div>
      <div className="px-[12px] pb-[8px] preview-content break-words" dangerouslySetInnerHTML={{ __html: first?.content || '' }} />
      <MediaGrid media={first?.media || []} rounded="rounded-none" />
      <div className="flex justify-around border-t border-borderLinkedin text-textLinkedin text-[13px] font-[600] py-[8px] mt-[8px]">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>🔁 Repost</span>
        <span>➤ Send</span>
      </div>
      {comments.map((c) => (
        <div key={c.id} className="flex gap-[8px] px-[12px] pb-[12px]">
          <img src={integration.picture} className="w-[32px] h-[32px] rounded-full" alt="" />
          <div className="flex-1 bg-newTextColor/5 rounded-[8px] p-[8px]">
            <div className="font-[600] text-[12px]">{integration.name}</div>
            <div className="preview-content break-words text-[13px]" dangerouslySetInnerHTML={{ __html: c.content }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const FacebookPreview: FC<{ values: PostValue[]; integration: Integration }> = ({ values, integration }) => {
  const [first, ...comments] = values;
  return (
    <div className="rounded-[12px] bg-bgFacebook text-[15px] overflow-hidden border border-borderPreview shadow-previewShadow">
      <div className="flex gap-[8px] p-[12px]">
        <img src={integration.picture} className="w-[40px] h-[40px] rounded-full" alt="" />
        <div className="flex flex-col">
          <div className="font-[600]">{integration.name}</div>
          <div className="text-[12px] opacity-60">Just now · 🌎</div>
        </div>
      </div>
      <div className="px-[12px] pb-[8px] preview-content break-words" dangerouslySetInnerHTML={{ __html: first?.content || '' }} />
      <MediaGrid media={first?.media || []} rounded="rounded-none" />
      <div className="flex justify-around border-t border-newTextColor/10 opacity-70 text-[14px] font-[600] py-[8px] mx-[12px] mt-[8px]">
        <span>Like</span>
        <span>Comment</span>
        <span>Share</span>
      </div>
      {comments.map((c) => (
        <div key={c.id} className="flex gap-[8px] px-[12px] pb-[12px]">
          <img src={integration.picture} className="w-[32px] h-[32px] rounded-full" alt="" />
          <div className="bg-bgCommentFacebook rounded-[16px] px-[12px] py-[8px]">
            <div className="font-[600] text-[13px]">{integration.name}</div>
            <div className="preview-content break-words text-[14px]" dangerouslySetInnerHTML={{ __html: c.content }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const InstagramPreview: FC<{ values: PostValue[]; integration: Integration }> = ({ values, integration }) => {
  const [first, ...comments] = values;
  const media = first?.media || [];
  return (
    <div className="rounded-[12px] bg-bgInstagram text-[14px] overflow-hidden border border-borderPreview shadow-previewShadow">
      <div className="flex gap-[8px] p-[12px] items-center">
        <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5]">
          <img src={integration.picture} className="w-[32px] h-[32px] rounded-full border-2 border-bgInstagram" alt="" />
        </div>
        <div className="font-[600] flex-1">{integration.display.replace('@', '')}</div>
        <div>•••</div>
      </div>
      <div className="aspect-square bg-black/40 flex items-center justify-center">
        {media[0] ? <MediaPreview media={media[0]} /> : <div className="text-[13px] opacity-60 p-[20px] text-center">Instagram requires at least one image or video</div>}
      </div>
      <div className="flex gap-[14px] p-[12px] text-[20px]">
        <span>♡</span>
        <span>💬</span>
        <span>➤</span>
        <span className="ms-auto">🔖</span>
      </div>
      <div className="px-[12px] pb-[12px] break-words">
        <span className="font-[600] me-[6px]">{integration.display.replace('@', '')}</span>
        <span className="preview-content inline" dangerouslySetInnerHTML={{ __html: first?.content || '' }} />
        {comments.map((c) => (
          <div key={c.id} className="mt-[6px] text-[13px]">
            <span className="font-[600] me-[6px]">{integration.display.replace('@', '')}</span>
            <span className="preview-content inline" dangerouslySetInnerHTML={{ __html: c.content }} />
          </div>
        ))}
      </div>
    </div>
  );
};

const YoutubePreview: FC<{ values: PostValue[]; integration: Integration; settings: Record<string, any> }> = ({ values, integration, settings }) => {
  const first = values[0];
  return (
    <div className="rounded-[12px] bg-bgYoutube overflow-hidden border border-borderPreview shadow-previewShadow">
      <div className="aspect-video bg-black flex items-center justify-center">
        {first?.media?.[0] ? <MediaPreview media={first.media[0]} /> : <img src="/no-picture.jpg" className="w-full h-full object-cover opacity-30" alt="" />}
      </div>
      <div className="p-[12px] flex gap-[12px]">
        <img src={integration.picture} className="w-[36px] h-[36px] rounded-full" alt="" />
        <div className="flex-1 min-w-0">
          <div className="font-[600] text-[16px] line-clamp-2">{settings?.title || 'Video title'}</div>
          <div className="text-[13px] opacity-60">{integration.name} • 0 views • now</div>
          <div className="text-[13px] mt-[8px] bg-youtubeBgAction rounded-[8px] p-[8px] preview-content break-words line-clamp-4" dangerouslySetInnerHTML={{ __html: first?.content || '' }} />
        </div>
      </div>
    </div>
  );
};

export const ShowAllProviders: FC = () => {
  const { current, selected, global, internal } = useLaunchStore(
    useShallow((s) => ({
      current: s.current,
      selected: s.selectedIntegrations,
      global: s.global,
      internal: s.internal,
    }))
  );

  if (current === 'global') {
    if (isEmpty(global) && !selected.length) {
      return (
        <div className="flex flex-col items-center justify-center text-center gap-[12px] h-full py-[60px] opacity-60 animate-fadeIn">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M2.42012 12.7132C2.28394 12.4975 2.21584 12.3897 2.17772 12.2234C2.14909 12.0985 2.14909 11.9015 2.17772 11.7766C2.21584 11.6103 2.28394 11.5025 2.42012 11.2868C3.54553 9.50484 6.8954 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7766C21.8517 11.9015 21.8517 12.0985 21.8231 12.2234C21.785 12.3897 21.7169 12.4975 21.5807 12.7132C20.4553 14.4952 17.1054 19 12.0004 19C6.8954 19 3.54553 14.4952 2.42012 12.7132Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.0004 15C13.6573 15 15.0004 13.6569 15.0004 12C15.0004 10.3431 13.6573 9 12.0004 9C10.3435 9 9.0004 10.3431 9.0004 12C9.0004 13.6569 10.3435 15 12.0004 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-[16px] font-[600]">Select a channel and start writing</div>
          <div className="text-[14px]">The preview of your post will show here</div>
        </div>
      );
    }
    return <GeneralPreview values={global} />;
  }

  const selectedIntegration = selected.find((p) => p.integration.id === current);
  if (!selectedIntegration) return null;
  const { integration, settings } = selectedIntegration;
  const values = internal.find((p) => p.integration.id === integration.id)?.integrationValue || global;

  switch (integration.identifier) {
    case 'linkedin':
    case 'linkedin-page':
      return <LinkedinPreview values={values} integration={integration} />;
    case 'facebook':
      return <FacebookPreview values={values} integration={integration} />;
    case 'instagram':
    case 'instagram-standalone':
      return <InstagramPreview values={values} integration={integration} />;
    case 'youtube':
      return <YoutubePreview values={values} integration={integration} settings={settings} />;
    default:
      return <GeneralPreview values={values} integration={integration} />;
  }
};
