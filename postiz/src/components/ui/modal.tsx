'use client';

// A port of Postiz's modal manager (components/layout/new-modal.tsx):
// stacked modals, blur of the app behind them, askClose confirmation and
// full screen modals for the post composer.

import clsx from 'clsx';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import { create } from 'zustand';
import { makeId } from '@/lib/utils';
import { Button } from './button';

export interface ModalOptions {
  id?: string;
  title?: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  fullScreen?: boolean;
  removeLayout?: boolean;
  withCloseButton?: boolean;
  askClose?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  size?: string | number;
  maxSize?: string | number;
  destructive?: boolean;
  onClose?: () => void;
}

interface ModalItem extends ModalOptions {
  id: string;
}

interface ModalStore {
  modals: ModalItem[];
  open: (modal: ModalOptions) => string;
  close: (id: string) => void;
  closeAll: () => void;
}

const useModalStore = create<ModalStore>((set) => ({
  modals: [],
  open: (modal) => {
    const id = modal.id || makeId(8);
    set((s) => ({
      modals: [...s.modals.filter((m) => m.id !== id), { ...modal, id }],
    }));
    return id;
  },
  close: (id) => set((s) => ({ modals: s.modals.filter((m) => m.id !== id) })),
  closeAll: () => set({ modals: [] }),
}));

const CurrentModalContext = createContext<{ id: string }>({ id: '' });

export const useModals = () => {
  const open = useModalStore((s) => s.open);
  const close = useModalStore((s) => s.close);
  const closeAll = useModalStore((s) => s.closeAll);
  const current = useContext(CurrentModalContext);
  return {
    openModal: open,
    closeById: close,
    closeAll,
    closeCurrent: useCallback(() => close(current.id), [current.id, close]),
  };
};

export const openModal = (modal: ModalOptions) =>
  useModalStore.getState().open(modal);
export const closeAllModals = () => useModalStore.getState().closeAll();

const DecisionContent: FC<{
  description: ReactNode;
  approveLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
  close: () => void;
}> = ({ description, approveLabel, cancelLabel, destructive, resolve, close }) => (
  <div className="flex flex-col">
    <div className="max-w-[600px] text-[15px] text-textItemBlur">{description}</div>
    <div className="flex gap-[12px] mt-[24px]">
      <Button
        className={clsx(destructive && '!bg-red-700')}
        onClick={() => {
          resolve(true);
          close();
        }}
      >
        {approveLabel}
      </Button>
      <Button
        secondary
        onClick={() => {
          resolve(false);
          close();
        }}
      >
        {cancelLabel}
      </Button>
    </div>
  </div>
);

export const decisionModal = (opts: {
  title: string;
  description: ReactNode;
  approveLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) =>
  new Promise<boolean>((resolve) => {
    let resolved = false;
    const done = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    const id = makeId(8);
    useModalStore.getState().open({
      id,
      title: opts.title,
      destructive: opts.destructive,
      closeOnClickOutside: true,
      closeOnEscape: true,
      onClose: () => done(false),
      children: (close) => (
        <DecisionContent
          description={opts.description}
          approveLabel={opts.approveLabel || 'Yes'}
          cancelLabel={opts.cancelLabel || 'No'}
          destructive={opts.destructive}
          resolve={done}
          close={close}
        />
      ),
    });
  });

export const deleteDialog = (message: string, confirmLabel = 'Yes, delete it!') =>
  decisionModal({
    title: 'Are you sure?',
    description: message,
    approveLabel: confirmLabel,
    cancelLabel: 'No, cancel!',
    destructive: true,
  });

const CloseX = () => (
  <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <path
      d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

const ModalRender: FC<{ modal: ModalItem; index: number; isLast: boolean }> = ({
  modal,
  index,
  isLast,
}) => {
  const close = useModalStore((s) => s.close);
  const zIndex = 400 + index * 2;

  const closeModal = useCallback(async () => {
    if (modal.askClose) {
      const sure = await decisionModal({
        title: 'Are you sure you want to close this modal?',
        description: '(all data will be lost)',
        approveLabel: 'Yes, close it!',
        cancelLabel: 'No, cancel!',
      });
      if (!sure) return;
    }
    modal.onClose?.();
    close(modal.id);
  }, [modal, close]);

  const silentClose = useCallback(() => {
    close(modal.id);
  }, [modal.id, close]);

  useEffect(() => {
    if (!isLast || modal.closeOnEscape === false) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLast, closeModal, modal.closeOnEscape]);

  const children =
    typeof modal.children === 'function'
      ? modal.children(silentClose)
      : modal.children;

  if (modal.removeLayout) {
    return (
      <CurrentModalContext.Provider value={{ id: modal.id }}>
        <div
          style={{ zIndex }}
          className={clsx(
            modal.fullScreen ? 'w-full h-full' : 'pb-[50px] min-w-full min-h-full',
            'fixed flex left-0 top-0 bg-popup backdrop-blur-[10px] transition-all animate-fadeIn overflow-y-auto text-newTextColor',
            !isLast && '!overflow-hidden'
          )}
        >
          <div className={clsx(modal.fullScreen && 'flex mobile:min-h-full', 'relative flex-1 mobile:min-w-0')}>
            <div
              className={clsx(
                modal.fullScreen
                  ? 'flex flex-1 mobile:min-w-0'
                  : 'absolute top-0 left-0 min-w-full min-h-full'
              )}
            >
              <div
                className={clsx(
                  'animate-scaleIn',
                  modal.fullScreen
                    ? 'w-full h-full flex-1 flex mobile:min-w-0 mobile:h-auto'
                    : 'mx-auto py-[48px] mobile:max-w-[100vw] mobile:py-[16px]'
                )}
              >
                <ModalCloseContext.Provider value={closeModal}>
                  {children}
                </ModalCloseContext.Provider>
              </div>
            </div>
          </div>
        </div>
      </CurrentModalContext.Provider>
    );
  }

  return (
    <CurrentModalContext.Provider value={{ id: modal.id }}>
      <div
        onClick={modal.closeOnClickOutside === false ? undefined : closeModal}
        style={{ zIndex }}
        className="fixed flex left-0 top-0 min-w-full min-h-full h-full bg-popup backdrop-blur-[10px] transition-all animate-fadeIn overflow-y-auto text-newTextColor pb-[50px]"
      >
        <div className="relative flex-1">
          <div className="absolute min-w-full mobile:w-full min-h-full pt-[100px] pb-[100px] mobile:pt-[24px] mobile:pb-[24px] mobile:px-[8px] top-0 left-0">
            <div
              className={clsx(
                'gap-[40px] p-[32px] mobile:gap-[24px] mobile:p-[16px] bg-newBgColorInner mx-auto flex flex-col w-fit rounded-[24px] mobile:rounded-[16px] relative mobile:!max-w-full animate-scaleIn',
                modal.destructive && 'border-2 border-red-700',
                modal.size ? '' : 'min-w-[600px] mobile:min-w-0 mobile:w-full'
              )}
              style={{
                ...(modal.size ? { width: modal.size } : {}),
                ...(modal.maxSize ? { maxWidth: modal.maxSize } : {}),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center">
                <div className="text-[24px] mobile:text-[20px] mobile:pe-[28px] font-[600] flex-1">
                  {modal.title}
                </div>
                {modal.withCloseButton !== false && (
                  <button
                    className="outline-none absolute end-[20px] top-[20px] mobile:end-[12px] mobile:top-[12px] w-[28px] h-[28px] rounded-[6px] flex items-center justify-center hover:bg-tableBorder cursor-pointer"
                    type="button"
                    onClick={closeModal}
                  >
                    <CloseX />
                  </button>
                )}
              </div>
              <div className="whitespace-pre-line">
                <ModalCloseContext.Provider value={closeModal}>
                  {children}
                </ModalCloseContext.Provider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CurrentModalContext.Provider>
  );
};

const ModalCloseContext = createContext<() => void>(() => {});
// Close the current modal, asking first when the modal has askClose
export const useAskClose = () => useContext(ModalCloseContext);

export const ModalManager = () => {
  const modals = useModalStore((s) => s.modals);

  useEffect(() => {
    const blur = modals.length > 0;
    document.body.classList.toggle('overflow-hidden', blur);
    document.querySelectorAll('.blurMe').forEach((p) => {
      p.classList.toggle('blur-xs', blur);
      p.classList.toggle('pointer-events-none', blur);
    });
  }, [modals.length]);

  return (
    <>
      {modals.map((modal, index) => (
        <ModalRender
          key={modal.id}
          modal={modal}
          index={index}
          isLast={index === modals.length - 1}
        />
      ))}
    </>
  );
};
