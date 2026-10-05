import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import countTokens from '@utils/messageUtils';
import { modelCost } from '@constants/modelLoader';
import useModelsReady from '@hooks/useModelsReady';
import { isImageContent } from '@type/chat';
import { estimateUsageCost, formatEstimatedCost } from '@utils/usageCost';

const TokenCount = React.memo(() => {
  useModelsReady();
  const { t } = useTranslation('main');
  const chat = useStore((state) => state.chats?.[state.currentChatIndex]);
  const estimate = useMemo(() => {
    if (!chat) return { tokens: 0, price: null };
    const tokens = countTokens(chat.messages, chat.config.model);
    const imageCount = chat.messages.reduce(
      (count, message) => count + message.content.filter(isImageContent).length,
      0
    );
    return {
      tokens,
      price: estimateUsageCost(
        { promptTokens: tokens, completionTokens: 0, imageTokens: imageCount },
        modelCost[chat.config.model]
      ),
    };
  }, [chat, modelCost]);
  return (
    <span
      className='text-xs text-[var(--fg-3)] font-mono tabular-nums'
      title={t('estimateNote', { ns: 'model' })}
    >
      {t('estimatedTokens')}: {estimate.tokens} ·{' '}
      {formatEstimatedCost(estimate.price, t('unknownCost'))}
    </span>
  );
});
export default TokenCount;
