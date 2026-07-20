import { View, SplitLayout, SplitCol } from '@vkontakte/vkui';

import { PublicCard } from './panels';

/** Slug визитки из query-параметра ?slug= (прототип: диплинк/launch-параметры — в roadmap). */
function getSlugFromUrl(): string | undefined {
  const slug = new URLSearchParams(window.location.search).get('slug');
  return slug ?? undefined;
}

export const App = () => {
  return (
    <SplitLayout>
      <SplitCol>
        <View activePanel="public-card">
          <PublicCard id="public-card" initialSlug={getSlugFromUrl()} />
        </View>
      </SplitCol>
    </SplitLayout>
  );
};
