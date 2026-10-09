'use client';

import clsx from 'clsx';
import dayjs from 'dayjs';
import { FC, useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDownIcon, CloseIcon, DropdownArrowSmallIcon, TrashIcon } from '@/components/ui/icons';
import { decisionModal, deleteDialog, useAskClose, useModals } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';
import { useDb } from '@/lib/db';
import { useClickOutside } from '@/lib/hooks';
import { getProvider } from '@/lib/providers';
import { stripHtml } from '@/lib/utils';
import { countChars, EditorWrapper } from './editor';
import { pushJobs } from '@/lib/sync';
import { PicksSocialsComponent } from './picks.socials';
import { DatePicker, RepeatComponent, TagsComponent } from './post.options';
import { ShowAllProviders } from './preview';
import { SelectCurrent } from './select.current';
import { hasSettings, ProviderSettings } from './settings.panel';
import { useLaunchStore, valuesFor } from './store';

const SelectCustomer: FC = () => {
  const customers = useDb((s) => s.customers);
  const allIntegrations = useDb((s) => s.integrations);
  const { integrations, selectedIntegrations, addOrRemove } = useLaunchStore(
    useShallow((s) => ({
      integrations: s.integrations,
      selectedIntegrations: s.selectedIntegrations,
      addOrRemove: s.addOrRemoveSelectedIntegration,
    }))
  );
  if (!customers.length) return null;
  return (
    <select
      onChange={(e) => {
        const customer = e.target.value;
        // select every channel of the customer
        selectedIntegrations.forEach((p) => addOrRemove(p.integration));
        if (!customer) return;
        allIntegrations
          .filter((p) => p.customer?.id === customer && !p.disabled)
          .forEach((p) => {
            const integration = integrations.find((i) => i.id === p.id);
            if (integration) addOrRemove(integration);
          });
      }}
      className="h-[40px] bg-newBgColorInner px-[12px] outline-none border-newTableBorder border rounded-[8px] text-[14px] cursor-pointer"
      defaultValue=""
    >
      <option value="">Selected Customer</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          Customer: {c.name}
        </option>
      ))}
    </select>
  );
};

export const ManageModal: FC<{ onDone?: () => void }> = () => {
  const toaster = useToaster();
  const modals = useModals();
  const askClose = useAskClose();
  const db = useDb();
  const store = useLaunchStore();
  const { selectedIntegrations, current, date, setDate, tags, setTags, repeater, setRepeater, existing, group, locked } = store;
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPostNow, setShowPostNow] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const postNowRef = useClickOutside<HTMLDivElement>(() => setShowPostNow(false));
  const currentIntegration = selectedIntegrations.find((p) => p.integration.id === current);

  const validate = useCallback((): string | null => {
    const state = useLaunchStore.getState();
    for (const selected of state.selectedIntegrations) {
      const provider = getProvider(selected.integration.identifier);
      const values = valuesFor(state, selected.integration.id);
      const name = `${selected.integration.name} (${provider.name.split('\n')[0]})`;
      for (const [index, value] of values.entries()) {
        if (!stripHtml(value.content).trim() && !value.media.length) {
          return index === 0 ? `${name}: Your post should have at least one character or one image.` : `${name}: Comment ${index} is empty.`;
        }
        const count = countChars(value.content);
        if (count > provider.maxChars) {
          return `${name}: The post is too long (${count}/${provider.maxChars}).`;
        }
      }
      if (provider.requiresMedia && !values[0]?.media.length) {
        return `${name}: You must attach at least one image or video.`;
      }
      const missing = provider.settings?.find((f) => f.required && !selected.settings[f.key]);
      if (missing) {
        state.setCurrent(selected.integration.id);
        setShowSettings(true);
        return `${name}: ${missing.label} is required.`;
      }
    }
    return null;
  }, []);

  const schedule = useCallback(
    (type: 'draft' | 'schedule' | 'now') => async () => {
      const state = useLaunchStore.getState();
      if (!state.selectedIntegrations.length) {
        toaster.show('Please select at least one channel', 'warning');
        return;
      }
      if (type !== 'draft') {
        state.setShowErrors(true);
        const error = validate();
        if (error) {
          toaster.show(error, 'warning');
          return;
        }
        if (type === 'schedule' && state.date.isBefore(dayjs())) {
          const now = await decisionModal({
            title: 'The date is in the past',
            description: 'Do you want to publish the post now instead?',
            approveLabel: 'Yes, post now',
            cancelLabel: 'Change the date',
          });
          if (!now) return;
          type = 'now';
        }
      }

      setLoading(true);
      const publishDate = type === 'now' ? dayjs().toISOString() : state.date.toISOString();
      db.createPosts({
        group: state.group,
        date: publishDate,
        state: type === 'draft' ? 'DRAFT' : 'QUEUE',
        tags: state.tags,
        intervalInDays: state.repeater || undefined,
        channels: state.selectedIntegrations.map((p) => ({
          integrationId: p.integration.id,
          values: valuesFor(state, p.integration.id),
          settings: p.settings,
        })),
      });
      setLoading(false);
      modals.closeAll();
      if (type === 'now') pushJobs(true);
      toaster.show(
        type === 'draft'
          ? 'Saved as draft'
          : type === 'now'
          ? 'Your post is being published'
          : existing
          ? 'Updated successfully'
          : 'Added successfully',
        'success'
      );
    },
    [db, modals, toaster, validate, existing]
  );

  const deletePost = useCallback(async () => {
    if (!group) return;
    if (await deleteDialog('Are you sure you want to delete this post?', 'Yes, delete it!')) {
      db.deleteGroup(group);
      modals.closeAll();
      toaster.show('Post deleted successfully', 'success');
    }
  }, [group, db, modals, toaster]);

  const scheduleLabel = existing ? 'Update' : selectedIntegrations.length ? 'Add to calendar' : 'Check the circles above';

  return (
    <div className="w-full h-full flex-1 p-[40px] mobile:p-0 flex relative">
      <div className="flex flex-1 min-w-0 bg-newBgColorInner rounded-[20px] mobile:rounded-none flex-col shadow-menu">
        <div className="hidden mobile:flex items-center gap-[8px] px-[16px] h-[60px] bg-newBgColor sticky top-0 z-[200]">
          <div className="flex-1 flex p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500]">
            {(['edit', 'preview'] as const).map((tab) => (
              <div
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={clsx('flex-1 text-center py-[6px] rounded-[6px] cursor-pointer transition-colors', mobileTab === tab && 'text-textItemFocused bg-boxFocused')}
              >
                {tab === 'edit' ? 'Edit' : 'Preview'}
              </div>
            ))}
          </div>
          <div className="cursor-pointer w-[36px] h-[36px] flex items-center justify-center" onClick={askClose}>
            <CloseIcon className="text-[#A3A3A3]" />
          </div>
        </div>
        <div className="flex-1 flex mobile:flex-col">
          <div className={clsx('flex flex-col flex-1 min-w-0 border-e border-newBorder', mobileTab === 'preview' && 'mobile:hidden')}>
            <div className="bg-newBgColor h-[65px] rounded-ss-[20px] flex items-center gap-[12px] px-[20px] text-[20px] font-[600] mobile:hidden">
              {existing ? 'Edit Post' : 'Create Post'}
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div className={clsx('flex-1 relative', showSettings && 'hidden')}>
                <div
                  id="social-content"
                  className="gap-[32px] mobile:gap-[16px] flex flex-col pe-[8px] pt-[20px] ps-[20px] mobile:px-[12px] mobile:static mobile:h-auto mobile:overflow-visible absolute top-0 left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
                >
                  <div className="flex w-full gap-[12px]">
                    <div className="flex flex-1">
                      <PicksSocialsComponent toolTip={true} />
                    </div>
                    {!existing && <SelectCustomer />}
                  </div>
                  <div className="flex flex-1 gap-[6px] flex-col">
                    <div className="flex">
                      <div className="flex-1">
                        <SelectCurrent />
                      </div>
                    </div>
                    <div className="flex-1 flex">
                      <EditorWrapper />
                    </div>
                    <div className="pb-[16px]" />
                  </div>
                </div>
              </div>
              <div
                className={clsx(
                  'pb-[20px] px-[20px] select-none',
                  showSettings && 'flex-1 flex pt-[20px]',
                  (current === 'global' || !currentIntegration || !hasSettings(currentIntegration.integration.identifier)) && 'hidden'
                )}
              >
                <div className="flex-1 flex flex-col rounded-[12px] overflow-hidden bg-newSettings">
                  <div
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                      'bg-[#612BD3] rounded-[12px] flex items-center gap-[8px] cursor-pointer p-[12px] transition-all',
                      showSettings ? '!rounded-b-none' : ''
                    )}
                  >
                    <div className="flex-1 text-[14px] font-[600] text-white">
                      {currentIntegration?.integration.name} Settings
                    </div>
                    <ChevronDownIcon rotated={showSettings} className="text-white" />
                  </div>
                  {showSettings && (
                    <div className="flex-1 text-[14px] text-textColor font-[500] relative">
                      <div className="absolute left-0 top-0 w-full h-full overflow-y-auto scrollbar scrollbar-thumb-newBgColorInner scrollbar-track-newColColor">
                        <ProviderSettings />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={clsx('w-[580px] tablet:w-[440px] mobile:!w-full flex flex-col', mobileTab === 'edit' && 'mobile:hidden')}>
            <div className="bg-newBgColor h-[65px] rounded-se-[20px] mobile:hidden flex items-center px-[20px] text-[20px] font-[600]">
              <div className="flex-1">Post Preview</div>
              <div className="cursor-pointer hover:rotate-90 transition-transform" onClick={askClose}>
                <CloseIcon className="text-[#A3A3A3]" />
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute mobile:static mobile:h-auto top-0 p-[20px] pe-[8px] left-0 w-full h-full overflow-x-hidden overflow-y-scroll scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
                <ShowAllProviders />
              </div>
            </div>
          </div>
        </div>
        <div className="select-none min-h-[84px] py-[20px] border-t border-newBorder flex items-center flex-wrap gap-y-[12px]">
          <div className="flex-1 flex ps-[20px] gap-[8px] flex-wrap">
            <TagsComponent value={tags} onChange={setTags} />
            <RepeatComponent repeat={repeater} onChange={setRepeater} />
          </div>
          <div className="pe-[20px] ps-[20px] flex items-center justify-end gap-[8px] flex-wrap">
            {existing && (
              <button onClick={deletePost} className="cursor-pointer flex text-[#FF3F3F] gap-[8px] items-center text-[15px] font-[600] me-[8px] hover:opacity-80">
                <TrashIcon />
                <div>Delete Post</div>
              </button>
            )}
            <DatePicker onChange={setDate} date={date} />
            <button
              disabled={selectedIntegrations.length === 0 || loading || locked}
              onClick={schedule('draft')}
              className="relative cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 px-[20px] h-[44px] bg-btnSimple justify-center items-center flex rounded-[8px] text-[15px] font-[600] transition-transform active:scale-95"
            >
              Save as Draft
            </button>
            <div ref={postNowRef} className="group cursor-pointer relative">
              <button
                disabled={selectedIntegrations.length === 0 || loading || locked}
                onClick={schedule('schedule')}
                className="text-white relative min-w-[180px] btnSub disabled:cursor-not-allowed disabled:opacity-80 outline-none gap-[8px] flex justify-center items-center h-[44px] rounded-[8px] bg-[#612BD3] ps-[20px] pe-[16px] transition-transform active:scale-95"
              >
                {loading && (
                  <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                    <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
                  </div>
                )}
                <div className={clsx('text-[15px] font-[600]', loading && 'invisible')}>{scheduleLabel}</div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPostNow(!showPostNow);
                  }}
                  className="flex justify-center items-center h-[20px] w-[20px] pt-[4px] arrow-change"
                >
                  <DropdownArrowSmallIcon className={clsx('group-hover:rotate-180 text-white transition-transform', showPostNow && 'rotate-180')} />
                </div>
              </button>
              <button
                onClick={schedule('now')}
                disabled={selectedIntegrations.length === 0 || loading || locked}
                className={clsx(
                  'rounded-[8px] z-[300] disabled:cursor-not-allowed disabled:opacity-80 absolute bottom-[100%] -start-[12px] p-[12px] w-[206px] bg-newBgColorInner animate-normalFadeIn',
                  showPostNow ? 'flex' : 'hidden group-hover:flex'
                )}
              >
                <div className="text-white rounded-[8px] bg-[#D82D7E] h-[44px] w-full flex justify-center items-center post-now hover:brightness-110">Post Now</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
