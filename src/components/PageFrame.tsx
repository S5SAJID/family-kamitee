import type {ReactNode} from 'react';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';

/**
 * Shared page frame: one pinned header (title + the page's single primary
 * action) above a scrolling body. Padding is set once on Layout so header,
 * body and side panel share one content line.
 *
 * Responsive contract (enforced by AppShell + each view):
 *   > 1024px  SideNav 256 (64 collapsed) | content | optional panel 380
 *   <= 1024px optional panel becomes a Dialog        (useMediaQuery in view)
 *   <= 768px  SideNav becomes the MobileNav drawer   (AppShell mobileNav "md")
 *
 * Wide displays: every page is capped by Layout `contentWidth` and centred
 * (header, body and panel share the same frame; dividers stay full-bleed).
 *   forms/settings 720 · overview 1080 · default 1200 · table + panel 1360
 */
export const PAGE_WIDTH = {form: 720, overview: 1080, default: 1200, wide: 1360} as const;

export function PageFrame({
  title,
  subtitle,
  actions,
  contentWidth,
  end,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  contentWidth?: number;
  end?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Layout
      height="fill"
      padding={6}
      defaultHasDividers
      contentWidth={contentWidth ?? PAGE_WIDTH.default}
      header={
        <LayoutHeader label={title}>
          <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
            <VStack gap={1}>
              <Heading level={1}>{title}</Heading>
              {subtitle && <Text color="secondary">{subtitle}</Text>}
            </VStack>
            {actions && (
              <HStack gap={2} wrap="wrap" vAlign="center">
                {actions}
              </HStack>
            )}
          </HStack>
        </LayoutHeader>
      }
      content={<LayoutContent>{children}</LayoutContent>}
      end={end}
    />
  );
}
