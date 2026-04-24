import React, { useEffect, useState } from 'react';
import useStore from '@store/store';

import ApiMenu from '@components/ApiMenu';

// First-visit onboarding. Reuses the full ApiMenu (firstRun) so a new user can
// reach API type / endpoint / version right away instead of a key-only popup.
const FirstVisitApiSetup = () => {
  const apiKey = useStore((state) => state.apiKey);
  const firstVisit = useStore((state) => state.firstVisit);
  const setFirstVisit = useStore((state) => state.setFirstVisit);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(
    !apiKey && firstVisit
  );

  useEffect(() => {
    setFirstVisit(false);
  }, []);

  if (!isModalOpen) return null;

  return <ApiMenu setIsModalOpen={setIsModalOpen} firstRun />;
};

export default FirstVisitApiSetup;
