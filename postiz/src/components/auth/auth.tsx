'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FC, ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { LogoTextComponent } from '@/components/layout/logo.text';
import { avatar } from '@/lib/utils';

// fictional testimonials for the demo
const testimonials1 = [
  { name: 'Maya Chen', role: 'Indie maker', text: 'I schedule a full month of posts in one afternoon. The calendar view is exactly what I needed.' },
  { name: 'Lucas Romero', role: 'Agency owner', text: 'Managing 30 client channels used to be chaos. Customers and groups made it simple.' },
  { name: 'Aisha Bello', role: 'Content creator', text: 'The preview for every network saves me from so many embarrassing typos.' },
  { name: 'Tom Becker', role: 'Startup founder', text: 'Open source, self hostable and beautiful. What else do you want?' },
  { name: 'Priya Nair', role: 'Marketing lead', text: 'Our team finally has one place to plan, review and publish everything.' },
];
const testimonials2 = [
  { name: 'Noah Kim', role: 'Developer advocate', text: 'Threads, delays and repeat posts. It handles the workflows I actually use.' },
  { name: 'Elena Rossi', role: 'Social media manager', text: 'Drag and drop rescheduling is so smooth, I use it every single day.' },
  { name: 'Samuel Okafor', role: 'Community manager', text: 'The analytics cards give me exactly the numbers my boss asks for.' },
  { name: 'Hana Sato', role: 'Freelancer', text: 'Switched from three different tools to this one. Never looking back.' },
  { name: 'David Levi', role: 'E-commerce owner', text: 'Instagram, TikTok and Pinterest from one composer, love it.' },
];

const Testimonial: FC<{ name: string; role: string; text: string }> = ({ name, role, text }) => (
  <div className="bg-[#1A1919] rounded-[12px] p-[20px] flex flex-col gap-[16px] text-[16px] border border-[#252525]">
    <div className="flex items-center gap-[12px]">
      <img src={avatar(name)} className="w-[40px] h-[40px] rounded-full" alt="" />
      <div>
        <div className="font-[600] text-[15px]">{name}</div>
        <div className="text-[13px] text-[#999]">{role}</div>
      </div>
    </div>
    <div className="text-[15px] leading-[1.5] text-[#ddd]">{text}</div>
  </div>
);

export const TestimonialComponent = () => (
  <div className="flex-1 relative w-full my-[30px] max-w-[850px]">
    <div className="absolute w-full h-full left-0 top-0 px-[40px] overflow-hidden">
      <div className="absolute w-full h-[120px] left-0 top-0 blackGradTopBg z-[100]" />
      <div className="absolute w-full h-[120px] left-0 bottom-0 blackGradBottomBg z-[100]" />
      <div className="flex justify-center gap-[12px]">
        <div className="flex flex-col animate-marqueeUp flex-1 gap-[12px]">
          {[1, 2].flatMap((p) => testimonials1.map((a) => <Testimonial key={p + a.name} {...a} />))}
        </div>
        <div className="flex flex-col animate-marqueeDown flex-1 gap-[12px]">
          {[1, 2].flatMap((p) => testimonials2.map((a) => <Testimonial key={p + a.name} {...a} />))}
        </div>
      </div>
    </div>
  </div>
);

export const AuthLayout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="dark bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white">
    <div className="flex flex-col py-[40px] px-[20px] flex-1 lg:w-[600px] lg:flex-none rounded-[12px] text-white bg-[#1A1919] animate-normalFadeIn">
      <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white">
        <LogoTextComponent />
        <div className="flex">{children}</div>
      </div>
    </div>
    <div className="text-[36px] flex-1 pt-[88px] hidden lg:flex flex-col items-center">
      <div className="text-center animate-normalFadeDown">
        Over <span className="text-[42px] text-[#FC69FF]">20,000+</span> Entrepreneurs use
        <br />
        Postiz To Grow Their Social Presence
      </div>
      <TestimonialComponent />
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
);

export const AuthForm: FC<{ register?: boolean }> = ({ register }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email');
    if (password.length < 3) return setError('Password must be at least 3 characters');
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    router.push('/launches');
  };

  return (
    <form className="flex-1 flex" onSubmit={submit}>
      <div className="flex flex-col flex-1">
        <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start">{register ? 'Sign Up' : 'Sign In'}</h1>
        <div className="text-[14px] mt-[32px] mb-[12px]">Continue With</div>
        <div
          onClick={() => router.push('/launches')}
          className="cursor-pointer bg-white h-[52px] rounded-[10px] flex justify-center items-center text-[#0E0E0E] gap-[10px] font-[600] hover:brightness-95 transition-all active:scale-[0.98]"
        >
          <GoogleIcon />
          Google
        </div>
        <div className="h-[20px] mb-[24px] mt-[24px] relative">
          <div className="absolute w-full h-[1px] bg-[#2b2b2b] top-[50%] -translate-y-[50%]" />
          <div className="absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex">
            <div className="px-[16px] bg-[#1A1919]">or</div>
          </div>
        </div>
        <div className="flex flex-col gap-[4px] dark">
          <Input label="Email" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} removeError />
          <div className="h-[8px]" />
          <Input label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} removeError />
          {register && (
            <>
              <div className="h-[8px]" />
              <Input label="Company" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} removeError />
            </>
          )}
          <div className="text-red-400 text-[13px] h-[20px] mt-[4px]">{error}</div>
        </div>
        <div className="text-center mt-6">
          <Button type="submit" className="w-full rounded-[10px] !h-[52px]" loading={loading}>
            {register ? 'Create Account' : 'Sign in'}
          </Button>
          <p className="mt-4 text-sm">
            {register ? 'Already Have An Account? ' : "Don't Have An Account? "}
            <Link href={register ? '/auth/login' : '/auth'} className="underline cursor-pointer">
              {register ? 'Sign In' : 'Sign Up'}
            </Link>
          </p>
          {!register && (
            <p className="mt-4 text-sm">
              <span className="underline hover:font-bold cursor-pointer opacity-80">Forgot password</span>
            </p>
          )}
        </div>
      </div>
    </form>
  );
};
