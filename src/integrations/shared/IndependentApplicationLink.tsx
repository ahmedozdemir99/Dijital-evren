import type { ReactNode } from 'react';
import { independentApplicationHref } from './liveApplications';

export function IndependentApplicationLink({ appId, className, children, href, color }: {
  appId: string;
  className?: string;
  children: ReactNode;
  href?: string;
  color?: string;
}) {
  return <a className={className} data-menu-color={color} href={href ?? independentApplicationHref(appId)}
    target="_blank" rel="noopener noreferrer">{children}</a>;
}
