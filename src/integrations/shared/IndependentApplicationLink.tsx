import type { ReactNode } from 'react';
import { independentApplicationHref } from './liveApplications';

export function IndependentApplicationLink({ appId, className, children, href }: {
  appId: string;
  className?: string;
  children: ReactNode;
  href?: string;
}) {
  return <a className={className} href={href ?? independentApplicationHref(appId)}
    target="_blank" rel="noopener noreferrer">{children}</a>;
}
