import translationKeys from '@/.translations/keys.json';
import type { TranslationExtension } from '@decentdocs/core/i18n';
import type { Translations as OwnTranslations } from '@/.translations';
import {
  type Translations as SharedTranslations,
  apiDocsTranslations,
} from '@decentdocs/shared-api/i18n';

export type Translations = OwnTranslations & SharedTranslations;
export function openapiTranslations(): TranslationExtension<keyof Translations> {
  const shared = apiDocsTranslations();
  return { keys: [...shared.keys, ...translationKeys] as never };
}
