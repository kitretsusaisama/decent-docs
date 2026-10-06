import Image from 'next/image';
import type { BaseLayoutProps, LinkItemType } from '@decentdocs/ui/layouts/shared';
import { DecentIcon } from '@/app/layout.client';
import Logo from '@/public/logo.png';

/** External links return once the fork has a public home (repo, blog, showcase). */
export const linkItems: LinkItemType[] = [];

export const logo = (
  <>
    <Image
      alt="Decent Docs"
      src={Logo}
      sizes="100px"
      className="hidden w-22 in-[.uwu]:block"
      aria-label="Decent Docs"
    />

    <DecentIcon className="size-5 in-[.uwu]:hidden" />
  </>
);

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          {logo}
          <span className="font-medium in-[.uwu]:hidden">Decent Docs</span>
        </>
      ),
    },
  };
}
