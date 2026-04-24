import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useStore from '@store/store';

import Toggle from '@components/Toggle/Toggle';

import CalculatorIcon from '@icon/CalculatorIcon';
import { modelCost } from '@constants/modelLoader';
import useModelsReady from '@hooks/useModelsReady';
import { TotalTokenUsed } from '@type/chat';
import { ModelOptions } from '@utils/modelReader';

type CostMapping = { model: string; cost: number }[];

const tokenCostToCost = (
  tokenCost: TotalTokenUsed[ModelOptions],
  model: ModelOptions
) => {
  if (!tokenCost) return 0;

  const modelCostEntry = modelCost[model as keyof typeof modelCost];

  if (!modelCostEntry) {
    return -1; // Return -1 if the model does not exist in modelCost
  }

  const { prompt, completion, image } = modelCostEntry;
  const completionCost =
    (completion.price / completion.unit) * tokenCost.completionTokens;
  const promptCost = (prompt.price / prompt.unit) * tokenCost.promptTokens;
  const imageCost =
    (image.price / image.unit) * (tokenCost.imageTokens ? 1 : 0);
  return completionCost + promptCost + imageCost;
};

const TotalTokenCost = () => {
  useModelsReady();
  const { t } = useTranslation(['main', 'model']);

  const totalTokenUsed = useStore((state) => state.totalTokenUsed);
  const setTotalTokenUsed = useStore((state) => state.setTotalTokenUsed);
  const countTotalTokens = useStore((state) => state.countTotalTokens);

  const [costMapping, setCostMapping] = useState<CostMapping>([]);

  const resetCost = () => {
    setTotalTokenUsed({});
  };

  useEffect(() => {
    const updatedCostMapping: CostMapping = [];
    Object.entries(totalTokenUsed).forEach(([model, tokenCost]) => {
      const cost = tokenCostToCost(tokenCost, model as ModelOptions);
      updatedCostMapping.push({ model, cost });
    });

    setCostMapping(updatedCostMapping);
  }, [totalTokenUsed]);

  return countTotalTokens ? (
    <div className='flex flex-col w-full'>
      <table className='w-full text-sm text-left text-[#5e5d59] dark:text-[#b0aea5]'>
        <thead className='text-xs text-[#4d4c48] dark:text-[#87867f] uppercase bg-[#e8e6dc] dark:bg-[#30302e]'>
          <tr>
            <th className='px-4 py-2'>{t('model', { ns: 'model' })}</th>
            <th className='px-4 py-2 text-right'>USD</th>
          </tr>
        </thead>
        <tbody>
          {costMapping.map(({ model, cost }) => (
            <tr
              key={model}
              className='border-b border-[#e8e6dc] dark:border-[#2e2e2b] hover:bg-[#ede9de] dark:hover:bg-[#2a2a27]'
            >
              <td className='px-4 py-2 text-xs'>{model}</td>
              <td className='px-4 py-2 text-right'>{cost.toPrecision(3)}</td>
            </tr>
          ))}
          <tr className='font-semibold border-t border-[#e8e6dc] dark:border-[#2e2e2b]'>
            <td className='px-4 py-2'>{t('total', { ns: 'main' })}</td>
            <td className='px-4 py-2 text-right'>
              {costMapping
                .reduce((prev, curr) => prev + curr.cost, 0)
                .toPrecision(3)}
            </td>
          </tr>
        </tbody>
      </table>
      <div className='px-4 py-3 border-t border-[#e8e6dc] dark:border-[#2e2e2b]'>
        <button
          className='text-xs px-3 py-1.5 rounded-lg bg-[#e8e6dc] dark:bg-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#dbd9cf] dark:hover:bg-[#4a4a46] transition-colors cursor-pointer'
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

  const [totalCost, setTotalCost] = useState<number>(0);

  useEffect(() => {
    let updatedTotalCost = 0;
    Object.entries(totalTokenUsed).forEach(([model, tokenCost]) => {
      updatedTotalCost += tokenCostToCost(tokenCost, model as ModelOptions);
    });

    setTotalCost(updatedTotalCost);
  }, [totalTokenUsed]);

  return (
    <div className='flex items-center gap-2 w-full px-2.5 py-1.5 text-[#5e5d59] dark:text-[#b0aea5] text-[13px]'>
      <CalculatorIcon className='h-4 w-4 shrink-0' />
      {`USD ${totalCost.toPrecision(3)}`}
    </div>
  );
};

export default TotalTokenCost;
