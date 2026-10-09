'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { FC, ReactNode, useState } from 'react';
import { useDb } from '@/lib/db';
import { useLocalState } from '@/lib/hooks';
import { platformIcon } from '@/lib/providers';
import { PostSet, Signature, Webhook } from '@/lib/types';
import { makeId, stripHtml, textToHtml } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Input, Select, Slider, Textarea } from '@/components/ui/form';
import { deleteDialog, useModals } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';
import { useMode } from '@/components/layout/mode';
import { SVGLine } from '@/components/launches/launches.component';

const Section: FC<{ title: string; description?: string; children: ReactNode; action?: ReactNode }> = ({ title, description, children, action }) => (
  <div className="flex flex-col gap-[16px] animate-normalFadeIn">
    <div className="flex items-start gap-[12px]">
      <div className="flex-1">
        <h3 className="text-[20px] font-[600]">{title}</h3>
        {description && <div className="text-[14px] text-textItemBlur mt-[4px]">{description}</div>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx('bg-newTableHeader border border-newTableBorder rounded-[12px] p-[20px]', className)}>{children}</div>
);

const GlobalSettings = () => {
  const user = useDb((s) => s.user);
  const updateUser = useDb((s) => s.updateUser);
  const shortlink = useDb((s) => s.shortlink);
  const setShortlink = useDb((s) => s.setShortlink);
  const emailNotifications = useDb((s) => s.emailNotifications);
  const setEmailNotifications = useDb((s) => s.setEmailNotifications);
  const { mode, setMode } = useMode();
  const toaster = useToaster();
  const [name, setName] = useState(user.name);
  const [orgName, setOrgName] = useState(user.orgName);
  const [bio, setBio] = useLocalState('profile-bio', '');

  return (
    <div className="flex flex-col gap-[32px]">
      <Section title="Profile" description="Add profile information">
        <Card className="flex flex-col gap-[8px]">
          <div className="flex items-center gap-[16px] mb-[12px]">
            <img src={user.picture} className="w-[64px] h-[64px] rounded-full object-cover" alt="" />
            <label className="cursor-pointer h-[40px] px-[16px] rounded-[8px] bg-btnSimple flex items-center text-[14px] hover:brightness-110">
              Upload a new avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => updateUser({ picture: reader.result as string });
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 mobile:grid-cols-1 gap-[16px]">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Organization" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a bit about yourself" />
          <div className="flex justify-end mt-[12px]">
            <Button
              onClick={() => {
                updateUser({ name, orgName });
                toaster.show('Profile updated', 'success');
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      </Section>
      <Section title="Preferences">
        <Card className="flex flex-col gap-[20px]">
          <div className="flex items-center justify-between gap-[16px]">
            <div>
              <div className="font-[600]">Dark mode</div>
              <div className="text-[13px] text-textItemBlur">Switch between the dark and light theme</div>
            </div>
            <Slider value={mode === 'dark'} onChange={(v) => setMode(v ? 'dark' : 'light')} />
          </div>
          <div className="flex items-center justify-between gap-[16px]">
            <div>
              <div className="font-[600]">Shortlink preference</div>
              <div className="text-[13px] text-textItemBlur">Shorten the links of your posts to track the clicks</div>
            </div>
            <div className="w-[220px]">
              <Select hideErrors value={shortlink} onChange={(e) => setShortlink(e.target.value as any)}>
                <option value="ask">Ask every time</option>
                <option value="yes">Always shorten</option>
                <option value="no">Never shorten</option>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-[16px]">
            <div>
              <div className="font-[600]">Email me when a post is published</div>
              <div className="text-[13px] text-textItemBlur">Get notified about successful posts</div>
            </div>
            <Slider value={emailNotifications.success} onChange={(v) => setEmailNotifications({ ...emailNotifications, success: v })} />
          </div>
          <div className="flex items-center justify-between gap-[16px]">
            <div>
              <div className="font-[600]">Email me when a post fails</div>
              <div className="text-[13px] text-textItemBlur">Get notified about errors</div>
            </div>
            <Slider value={emailNotifications.failure} onChange={(v) => setEmailNotifications({ ...emailNotifications, failure: v })} />
          </div>
        </Card>
      </Section>
    </div>
  );
};

const AddMemberModal: FC<{ close: () => void }> = ({ close }) => {
  const invite = useDb((s) => s.inviteMember);
  const toaster = useToaster();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [sendEmail, setSendEmail] = useState(true);
  return (
    <div className="flex flex-col gap-[10px] min-w-[400px]">
      {sendEmail && <Input label="Email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as any)}>
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </Select>
      <div className="flex gap-[8px] items-center cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
        <Check value={sendEmail} onChange={setSendEmail} />
        <div>Send invitation via email?</div>
      </div>
      <Button
        className="mt-[18px]"
        disabled={sendEmail && !/^\S+@\S+\.\S+$/.test(email)}
        onClick={async () => {
          if (sendEmail) {
            invite(email, role);
            toaster.show('Invitation link sent', 'success');
          } else {
            try {
              await navigator.clipboard.writeText(`${window.location.origin}/auth?invite=${makeId(12)}`);
            } catch {}
            toaster.show('Link copied to clipboard', 'success');
          }
          close();
        }}
      >
        {sendEmail ? 'Send Invitation Link' : 'Copy Link'}
      </Button>
    </div>
  );
};

const TeamsComponent = () => {
  const team = useDb((s) => s.team);
  const user = useDb((s) => s.user);
  const removeMember = useDb((s) => s.removeMember);
  const modals = useModals();
  return (
    <Section
      title="Team Members"
      description="Invite your assistant or team member to manage your account"
      action={<Button onClick={() => modals.openModal({ title: 'Add Member', children: (close) => <AddMemberModal close={close} /> })}>Add another member</Button>}
    >
      <Card className="flex flex-col gap-[4px] !p-[8px]">
        {team.map((member) => (
          <div key={member.id} className="flex items-center gap-[12px] p-[12px] rounded-[8px] hover:bg-boxHover animate-normalFadeIn">
            <div className="w-[36px] h-[36px] rounded-full bg-[#612BD3] text-white flex items-center justify-center font-[600]">{member.email[0].toUpperCase()}</div>
            <div className="flex-1">
              <div className="font-[600]">{member.name}</div>
              <div className="text-[13px] text-textItemBlur">{member.email}</div>
            </div>
            <div className="text-[13px] px-[10px] py-[4px] rounded-full bg-btnSimple">{member.role === 'ADMIN' ? 'Admin' : member.role === 'SUPERADMIN' ? 'Super Admin' : 'User'}</div>
            {member.id !== user.id && (
              <Button
                secondary
                className="!h-[32px] !px-[12px] text-[13px]"
                onClick={async () => {
                  if (await deleteDialog('Are you sure you want to remove this team member?', 'Yes, remove it')) removeMember(member.id);
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </Card>
    </Section>
  );
};

const WebhookModal: FC<{ webhook?: Webhook; close: () => void }> = ({ webhook, close }) => {
  const integrations = useDb((s) => s.integrations);
  const save = useDb((s) => s.saveWebhook);
  const toaster = useToaster();
  const [name, setName] = useState(webhook?.name || '');
  const [url, setUrl] = useState(webhook?.url || '');
  const [selected, setSelected] = useState<string[]>(webhook?.integrations || []);
  const valid = name && /^https?:\/\//.test(url);
  return (
    <div className="flex flex-col gap-[4px] min-w-[480px]">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="URL" placeholder="https://example.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="text-[14px] mb-[8px]">Select integrations</div>
      <div className="flex flex-wrap gap-[10px] mb-[16px]">
        {integrations.map((i) => (
          <div
            key={i.id}
            data-tooltip-id="tooltip"
            data-tooltip-content={i.name}
            onClick={() => setSelected(selected.includes(i.id) ? selected.filter((s) => s !== i.id) : [...selected, i.id])}
            className={clsx('relative cursor-pointer rounded-full border-2 transition-all', selected.includes(i.id) ? 'border-[#622FF6]' : 'border-transparent grayscale opacity-60')}
          >
            <img src={i.picture} className="w-[40px] h-[40px] rounded-full" alt="" />
            <img src={platformIcon(i.identifier)} className="w-[16px] absolute bottom-0 -end-[4px] rounded-[4px]" alt="" />
          </div>
        ))}
      </div>
      <div className="flex gap-[8px]">
        <Button
          secondary
          disabled={!valid}
          onClick={() => toaster.show('Webhook test sent successfully', 'success')}
        >
          Send Test
        </Button>
        <Button
          disabled={!valid}
          onClick={() => {
            save({ id: webhook?.id || makeId(10), name, url, integrations: selected });
            toaster.show('Webhook saved', 'success');
            close();
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

const Webhooks = () => {
  const webhooks = useDb((s) => s.webhooks);
  const remove = useDb((s) => s.deleteWebhook);
  const modals = useModals();
  const open = (webhook?: Webhook) =>
    modals.openModal({ title: webhook ? 'Edit Webhook' : 'Add Webhook', children: (close) => <WebhookModal webhook={webhook} close={close} /> });
  return (
    <Section title="Webhooks" description="Webhooks are a way to get notified when something happens in Postiz via an HTTP request." action={<Button onClick={() => open()}>Add a webhook</Button>}>
      <Card className="!p-0 overflow-hidden">
        {!webhooks.length && <div className="p-[24px] text-center text-textItemBlur">No webhooks yet</div>}
        {webhooks.map((w) => (
          <div key={w.id} className="flex items-center gap-[12px] p-[16px] border-b border-newTableBorder last:border-0 animate-normalFadeIn">
            <div className="flex-1 min-w-0">
              <div className="font-[600]">{w.name}</div>
              <div className="text-[13px] text-textItemBlur truncate">{w.url}</div>
            </div>
            <div className="text-[13px] text-textItemBlur">{w.integrations.length} channels</div>
            <Button secondary className="!h-[32px] !px-[12px]" onClick={() => open(w)}>
              Edit
            </Button>
            <Button
              secondary
              className="!h-[32px] !px-[12px] !text-red-400"
              onClick={async () => {
                if (await deleteDialog('Are you sure you want to delete this webhook?')) remove(w.id);
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </Card>
    </Section>
  );
};

const SignatureModal: FC<{ signature?: Signature; close: () => void }> = ({ signature, close }) => {
  const save = useDb((s) => s.saveSignature);
  const [content, setContent] = useState(stripHtml(signature?.content || ''));
  const [autoAdd, setAutoAdd] = useState(!!signature?.autoAdd);
  return (
    <div className="flex flex-col gap-[16px] min-w-[480px]">
      <Textarea label="Signature" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[160px]" autoFocus />
      <div className="flex items-center gap-[8px] cursor-pointer" onClick={() => setAutoAdd(!autoAdd)}>
        <Check value={autoAdd} onChange={setAutoAdd} />
        <div>Auto add the signature to new posts</div>
      </div>
      <Button
        disabled={!content}
        onClick={() => {
          save({ id: signature?.id || makeId(10), content: textToHtml(content), autoAdd });
          close();
        }}
      >
        Save
      </Button>
    </div>
  );
};

const Signatures = () => {
  const signatures = useDb((s) => s.signatures);
  const remove = useDb((s) => s.deleteSignature);
  const modals = useModals();
  const open = (signature?: Signature) =>
    modals.openModal({ title: signature ? 'Edit Signature' : 'Add Signature', children: (close) => <SignatureModal signature={signature} close={close} /> });
  return (
    <Section title="Signatures" description="You can add signatures to your account to be used in your posts." action={<Button onClick={() => open()}>Add a signature</Button>}>
      <div className="grid grid-cols-2 mobile:grid-cols-1 gap-[12px]">
        {!signatures.length && <Card className="text-center text-textItemBlur col-span-2">No signatures yet</Card>}
        {signatures.map((s) => (
          <Card key={s.id} className="flex flex-col gap-[12px] animate-normalFadeIn">
            <div className="whitespace-pre-wrap text-[14px] flex-1">{stripHtml(s.content)}</div>
            <div className="flex items-center gap-[8px]">
              {s.autoAdd && <div className="text-[12px] px-[8px] py-[2px] rounded-full bg-[#612BD3] text-white">Auto add</div>}
              <div className="flex-1" />
              <Button secondary className="!h-[32px] !px-[12px]" onClick={() => open(s)}>
                Edit
              </Button>
              <Button
                secondary
                className="!h-[32px] !px-[12px] !text-red-400"
                onClick={async () => {
                  if (await deleteDialog('Are you sure you want to delete this signature?')) remove(s.id);
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
};

const SetModal: FC<{ set?: PostSet; close: () => void }> = ({ set, close }) => {
  const integrations = useDb((s) => s.integrations);
  const save = useDb((s) => s.saveSet);
  const parsed = set ? JSON.parse(set.content) : { channels: [], content: '' };
  const [name, setName] = useState(set?.name || '');
  const [description, setDescription] = useState(set?.description || '');
  const [content, setContent] = useState(stripHtml(parsed.content));
  const [channels, setChannels] = useState<string[]>(parsed.channels);
  return (
    <div className="flex flex-col gap-[4px] min-w-[520px]">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="text-[14px] mb-[8px]">Channels</div>
      <div className="flex flex-wrap gap-[10px] mb-[16px]">
        {integrations.map((i) => (
          <div
            key={i.id}
            data-tooltip-id="tooltip"
            data-tooltip-content={i.name}
            onClick={() => setChannels(channels.includes(i.id) ? channels.filter((s) => s !== i.id) : [...channels, i.id])}
            className={clsx('relative cursor-pointer rounded-full border-2 transition-all', channels.includes(i.id) ? 'border-[#622FF6]' : 'border-transparent grayscale opacity-60')}
          >
            <img src={i.picture} className="w-[40px] h-[40px] rounded-full" alt="" />
            <img src={platformIcon(i.identifier)} className="w-[16px] absolute bottom-0 -end-[4px] rounded-[4px]" alt="" />
          </div>
        ))}
      </div>
      <Textarea label="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <Button
        className="mt-[16px]"
        disabled={!name}
        onClick={() => {
          save({ id: set?.id || makeId(10), name, description, content: JSON.stringify({ channels, content: textToHtml(content) }) });
          close();
        }}
      >
        Save Set
      </Button>
    </div>
  );
};

const Sets = () => {
  const sets = useDb((s) => s.sets);
  const remove = useDb((s) => s.deleteSet);
  const modals = useModals();
  const open = (set?: PostSet) => modals.openModal({ title: set ? 'Edit Set' : 'Add Set', children: (close) => <SetModal set={set} close={close} /> });
  return (
    <Section
      title="Sets"
      description="Sets are a predefined selection of channels and content. When you create a post you will be asked to pick one."
      action={<Button onClick={() => open()}>Add a set</Button>}
    >
      <Card className="!p-0 overflow-hidden">
        {!sets.length && <div className="p-[24px] text-center text-textItemBlur">No sets yet</div>}
        {sets.map((s) => (
          <div key={s.id} className="flex items-center gap-[12px] p-[16px] border-b border-newTableBorder last:border-0 animate-normalFadeIn">
            <div className="flex-1">
              <div className="font-[600]">{s.name}</div>
              {s.description && <div className="text-[13px] text-textItemBlur">{s.description}</div>}
            </div>
            <Button secondary className="!h-[32px] !px-[12px]" onClick={() => open(s)}>
              Edit
            </Button>
            <Button
              secondary
              className="!h-[32px] !px-[12px] !text-red-400"
              onClick={async () => {
                if (await deleteDialog('Are you sure you want to delete this set?')) remove(s.id);
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </Card>
    </Section>
  );
};

const PublicApi = () => {
  const toaster = useToaster();
  const [key, setKey] = useLocalState('public-api-key', makeId(32));
  const [reveal, setReveal] = useState(false);
  return (
    <Section title="Public API" description="Use Postiz API to integrate with your tools.">
      <Card className="flex flex-col gap-[16px]">
        <div className="flex items-center gap-[8px] bg-newBgColorInner border border-newTableBorder rounded-[8px] h-[44px] px-[16px] font-mono text-[14px]">
          <div className="flex-1 truncate">{reveal ? key : key.slice(0, 4) + '•'.repeat(24)}</div>
          <button className="text-[13px] underline" onClick={() => setReveal(!reveal)}>
            {reveal ? 'Hide' : 'Reveal'}
          </button>
        </div>
        <div className="flex gap-[8px]">
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(key);
              } catch {}
              toaster.show('Key copied to clipboard', 'success');
            }}
          >
            Copy Key
          </Button>
          <Button
            secondary
            onClick={async () => {
              if (await deleteDialog('Rotating the key will break every integration that uses the current one.', 'Yes, rotate it')) {
                setKey(makeId(32));
                toaster.show('API key rotated', 'success');
              }
            }}
          >
            Rotate Key
          </Button>
        </div>
      </Card>
    </Section>
  );
};

const tabs = [
  { tab: 'global_settings', label: 'Global Settings', component: GlobalSettings },
  { tab: 'teams', label: 'Teams', component: TeamsComponent },
  { tab: 'webhooks', label: 'Webhooks', component: Webhooks },
  { tab: 'sets', label: 'Sets', component: Sets },
  { tab: 'signatures', label: 'Signatures', component: Signatures },
  { tab: 'api', label: 'Public API', component: PublicApi },
];

export const SettingsComponent = () => {
  const [tab, setTab] = useLocalState('settings-tab', 'global_settings');
  const router = useRouter();
  const current = tabs.find((t) => t.tab === tab) || tabs[0];
  const Component = current.component;
  return (
    <>
      <div className="bg-newBgColorInner p-[20px] mobile:p-[12px] flex flex-col transition-all w-[260px] mobile:w-full">
        <div className="flex flex-1 flex-col gap-[15px] mobile:flex-row mobile:gap-[8px] mobile:overflow-x-auto mobile:pb-[6px]">
          {tabs.map(({ tab: tabKey, label }) => (
            <div
              key={tabKey}
              className={clsx(
                'cursor-pointer flex items-center gap-[12px] group/profile hover:bg-boxHover rounded-e-[8px] mobile:shrink-0 mobile:whitespace-nowrap mobile:rounded-[8px] mobile:px-[12px] mobile:py-[8px] transition-colors',
                tabKey === current.tab && 'bg-boxHover'
              )}
              onClick={() => setTab(tabKey)}
            >
              <div className={clsx('h-full w-[4px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity mobile:hidden', tabKey === current.tab && 'opacity-100')}>
                <SVGLine />
              </div>
              {label}
            </div>
          ))}
        </div>
        <div className="mt-4 mobile:mt-[8px]">
          <div className="text-red-400 cursor-pointer hover:underline" onClick={() => router.push('/auth/login')}>
            Logout from Postiz
          </div>
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[20px] mobile:p-[12px] gap-[12px] overflow-y-auto">
        <div className="w-full max-w-[900px] mx-auto" key={current.tab}>
          <Component />
        </div>
      </div>
    </>
  );
};
