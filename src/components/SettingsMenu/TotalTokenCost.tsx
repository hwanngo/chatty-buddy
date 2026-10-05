import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useStore from '@store/store';

import Toggle from '@components/Toggle/Toggle';

import Icon from '@components/Icon';
import { modelCost } from '@constants/modelLoader';
import useModelsReady from '@hooks/useModelsReady';

import {
  estimateUsageCost,
  formatEstimatedCost,
  summarizeCosts,
} from '@utils/usageCost';

const TotalTokenCost = () => {
  useModelsReady();
  const { t } = useTranslation(['main', 'model']);

  const totalTokenUsed = useStore((state) => state.totalTokenUsed);
  const setTotalTokenUsed = useStore((state) => state.setTotalTokenUsed);
  const countTotalTokens = useStore((state) => state.countTotalTokens);

  const costMapping = Object.entries(totalTokenUsed).map(([model, usage]) => ({
    model,
    cost: estimateUsageCost(usage, modelCost[model]),
  }));
  const summary = summarizeCosts(costMapping.map(({ cost }) => cost));
  const resetCost = () => setTotalTokenUsed({});

  return countTotalTokens ? (
    <div className='flex flex-col w-full'>
      <p className='px-4 py-2 text-xs text-[var(--fg-2)]'>
        {t('estimateNote', { ns: 'model' })}
      </p>
      <table className='w-full text-sm text-left text-[var(--fg-2)]'>
        <thead className='text-xs text-[var(--fg-btn)] uppercase bg-[var(--bg-sand)]'>
          <tr>
            <th className='px-4 py-2'>{t('model', { ns: 'model' })}</th>
            <th className='px-4 py-2 text-right'>{t('estimatedCost')}</th>
          </tr>
        </thead>
        <tbody>
          {costMapping.map(({ model, cost }) => (
            <tr
              key={model}
              className='border-b border-[var(--border-mid)] hover:bg-[var(--bg-sand)]'
            >
              <td className='px-4 py-2 text-xs'>{model}</td>
              <td className='px-4 py-2 text-right'>
                {formatEstimatedCost(cost, t('unknownCost'))}
              </td>
            </tr>
          ))}
          <tr className='font-semibold border-t border-[var(--border-mid)]'>
            <td className='px-4 py-2'>{t('total', { ns: 'main' })}</td>
            <td className='px-4 py-2 text-right'>
              {summary.complete
                ? formatEstimatedCost(summary.knownTotal, t('unknownCost'))
                : `${t('partialCost')}: ${formatEstimatedCost(summary.knownTotal, t('unknownCost'))}`}
            </td>
          </tr>
        </tbody>
      </table>
      <div className='px-4 py-3 border-t border-[var(--border-mid)]'>
        <button
          className='text-xs px-3 py-1.5 rounded-lg bg-[var(--border-mid)] text-[var(--fg-2)] hover:bg-[var(--ring)] transition-colors cursor-pointer'
          onClick={resetCost}
        >
          {t('resetCost', { ns: 'main' })}
        </button>
      </div>
    </div>
  ) : (
    <></>
  );
};

export const TotalTokenCostToggle = ({
  reversed,
  description,
}: { reversed?: boolean; description?: string } = {}) => {
  const { t } = useTranslation('main');

  const setCountTotalTokens = useStore((state) => state.setCountTotalTokens);

  const [isChecked, setIsChecked] = useState<boolean>(
    useStore.getState().countTotalTokens
  );

  useEffect(() => {
    setCountTotalTokens(isChecked);
  }, [isChecked]);

  return (
    <Toggle
      label={t('countTotalTokens') as string}
      isChecked={isChecked}
      setIsChecked={setIsChecked}
      reversed={reversed}
      description={description}
    />
  );
};

export const TotalTokenCostDisplay = () => {
  useModelsReady();
  const { t } = useTranslation();
  const totalTokenUsed = useStore((state) => state.totalTokenUsed);

  const summary = summarizeCosts(
    Object.entries(totalTokenUsed).map(([model, usage]) =>
      estimateUsageCost(usage, modelCost[model])
    )
  );

  return (
    <div className='flex items-center gap-2 w-full px-2.5 py-1.5 text-[var(--fg-2)] text-[13px]'>
      <Icon name='calculator' className='h-4 w-4 shrink-0' />
      {`${t(summary.complete ? 'estimatedCost' : 'partialCost')}: ${formatEstimatedCost(summary.knownTotal, t('unknownCost'))}`}
    </div>
  );
};

export default TotalTokenCost;
