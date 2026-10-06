import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from '@decentdocs/ui/layouts/home';
import { DefaultNotFound } from '@decentdocs/ui/layouts/home/not-found';

export function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <DefaultNotFound />
    </HomeLayout>
  );
}
